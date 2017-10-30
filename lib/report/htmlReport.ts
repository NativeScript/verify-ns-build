const { join, resolve } = require("path");
const { readFileSync, writeFileSync } = require("fs");

const { REPORT_DIR, HTML_REPORT_FILENAME } = require("../constants");
const { writeFile } = require("../fs");
const { underline } = require("../utils");

export function saveHtmlReport(data) {
    const report = generateSunburstHtml(data);
    const absolutePath = resolve(REPORT_DIR, HTML_REPORT_FILENAME);
    writeFileSync(absolutePath, report);

    console.log(`HTML report saved to file://${underline(absolutePath)}`);
}

function generateSunburstHtml(data): string {
    const script = dump("./sunburst.js");
    const d3 = dump("./d3.v3.min.js");

    return `<!DOCTYPE html>
<meta charset="utf-8">
<style>
    body {
        font-family: 'Arial', sans-serif;
    }

    article, aside {
        float: left;
    }

    #sequence text {
        font-weight: 600;
        fill: #fff;
        font-size: 18px;
    }

    #sunburst path {
        stroke: #fff;
    }
</style>
<body>
    <article>
        <div id="sequence"></div>
        <div id="sunburst"></div>
    </article>

    <aside id="meta">
        <h1></h1>
        <div id="content">
        </div>
    </aside>
    <script>
        ${d3}
        const json = ${JSON.stringify(data)};
        ${script}
    </script>
</body>`
}

function dump(file: string) {
    return readFileSync(join(__dirname, file)).toString();
}

