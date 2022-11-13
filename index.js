const core = require('@actions/core');
const fs = require('fs');

function retrieve(data, line, col) {
    return data.split("\n")[line].split("\t")[col];
}

function parse(data, line, col) {
    return parseInt(retrieve(data, line, col));
}

function makeRecord(title, data, line) {
    let result = "<tr><td>" + title + "</td>";
    for (let i = 1; i < 6; i++) {
        result += "<td>" + retrieve(data, line, i) + "</td>";
    }
    return (result + "</tr>");
}

function genDetailTotal(data) {
    return "<tr><th></th><th>Segments</th><th>Words</th><th>Characters(w/o spaces)</th></th>Characters(w/ spaces)</th><th>#Files</th></tr>" +
           makeRecord("Total", data, 1) + makeRecord("Remaining", data, 2) +
           makeRecord("Unique", data, 3) + makeRecord("Unique remaining", data, 4);
}

function genDetailEach(data) {
    let result = "<tr><th>Filename</th><th>Segments</th><th>Words</th><th>Characters</th><th></tr>";
    let detailLines = data.split("\n");
    try {
        for (let i = 3; i < detailLines.length; i++) {
            if (detailLines[i].length === 0) {
                continue;
            }
            let item = detailLines[i].split("\t");
            let progressS = (100 * (parseInt(item[3].trim()) - parseInt(item[4].trim())) / parseInt(item[3].trim())).toFixed(0);
            let progressW = (100 * (parseInt(item[7].trim()) - parseInt(item[8].trim())) / parseInt(item[7].trim())).toFixed(0);
            let progressC = (100 * (parseInt(item[11].trim()) - parseInt(item[12].trim())) / parseInt(item[11].trim())).toFixed(0);
            result += `<tr><td>${item[0].trim()}</td><td><img alt="${progressS}%" src="https://progress-bar.dev/${progressS}/"></td>`;
            result += `<td><img alt="${progressW}%" src="https://progress-bar.dev/${progressW}/"></td>`;
            result += `<td><img alt="${progressC}%" src="https://progress-bar.dev/${progressC}/"></td></tr>`;
        }
    } catch(error) {
        core.setFailed(error.message);
    }
    return result;
}


async function run() {
    let data;
    const stats = {
        source: 0,
        targetCount: 0,
        sourceCountWOD: 0,
        targetCountWOD: 0,
        summary: "",
        detailTotal: "",
        detailEach: "",
        coverage: 0,
    };

    const statsfile = "omegat/project_stats.txt";

    core.info('Writing OmegaT stats summary');
    try {
        data = fs.readFileSync(statsfile, 'utf8').toString();
        stats.source = parse(data,4, 1);
        stats.remain = parse(data, 5, 1);
        stats.sourceWOD = parse(data, 6, 1);
        stats.remainWOD = parse(data, 7, 1);
        let progress = stats.sourceWOD - stats.remainWOD
        stats.coverage = 100.0 * progress / stats.sourceWOD
        stats.summary = ` - translated ${progress} of ${stats.sourceWOD}(${stats.coverage.toFixed(2)}%)`;
        stats.detailTotal = genDetailTotal(data.split("\n\n")[1]);
        stats.detailEach = genDetailEach(data.split("\n\n\n")[1]);
        core.info(stats.summary);
        core.setOutput('coverage', stats.coverage.toString());
    } catch (error) {
        core.setFailed(error.message);
    }
    core.summary.addHeading(`${stats.coverage.toFixed(0)}% coverage.`, 3);
    core.summary.addRaw(`<table>${stats.detailTotal}</table><details><table>${stats.detailEach}</table></details>`)
    await core.summary.write();
}

run();
