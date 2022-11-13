const core = require('@actions/core');
const { Octokit } = require("@octokit/action");
const fs = require('fs');


function retrieve(data, line, col) {
    return data.split("\n")[line].split("\t")[col];
}

function parse(data, line, col) {
    return parseInt(retrieve(data, line, col));
}

function makeRecord(title, data, line) {
    let result = "| " + title + " ";
    for (let i = 1; i < 6; i++) {
        result += "| " + retrieve(data, line, i) + " ";
    }
    return (result + "|\n");
}

function genDetailTotal(data) {
    return "|  | Segments | Words | Characters(w/o spaces) | Characters(w/ spaces) | #Files |\n" +
           "| :-- | --: | --: | --: | --: | --: |\n" +
           makeRecord("Total", data, 1) + makeRecord("Remaining", data, 2) +
           makeRecord("Unique", data, 3) + makeRecord("Unique remaining", data, 4) + "\n";
}

function genDetailEach(data) {
    let result = "| Filename | Segments | Words | Characters |\n| :-- | --: | --: | --: |\n";
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
            result += `| ${item[0].trim()} | ![${progressS}%](https://progress-bar.dev/${progressS}/) |`;
            result += ` ![${progressW}%](https://progress-bar.dev/${progressW}/) |`;
            result += ` ![${progressC}%](https://progress-bar.dev/${progressC}/) |\n`;
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
        detail: "",
        coverage: 0,
    };

    const minCoverage = parseFloat(core.getInput("min-coverage") || "0.0");
    const targetCoverage = parseFloat(core.getInput("target-coverage") || minCoverage)
    const statsfile = "omegat/project_stats.txt";

    try {
        data = fs.readFileSync(statsfile, 'utf8').toString();
        stats.source = parse(data,4, 1);
        stats.remain = parse(data, 5, 1);
        stats.sourceWOD = parse(data, 6, 1);
        stats.remainWOD = parse(data, 7, 1);
        let progress = stats.sourceWOD - stats.remainWOD
        stats.coverage = 100.0 * progress / stats.sourceWOD
        stats.summary = ` - ![${stats.coverage.toFixed(0)}%](https://progress-bar.dev/${stats.coverage.toFixed(0)}/) `
            + ` translated ${progress} of ${stats.sourceWOD}(${stats.coverage.toFixed(2)}%)`
            + `, min: ${minCoverage}%, target ${targetCoverage}%`;
        stats.detail = genDetailTotal(data.split("\n\n")[1]);
        let detailBars = genDetailEach(data.split("\n\n\n")[1]);
        if (stats.detail.length + detailBars.length < 65535) {
            stats.detail += detailBars;
        }
        const htmlSummary = `<img src="https://progress-bar.dev/${stats.coverage.toFixed(0)}/"/>`
            + ` translated ${progress} of ${stats.sourceWOD}(${stats.coverage.toFixed(2)}%)`
            + `, min: ${minCoverage}%, target ${targetCoverage}%`;
        core.info(htmlSummary);
        core.setOutput('coverage', stats.coverage.toString());
    } catch (error) {
        core.setFailed(error.message);
    }

    let conclusion;
    if (stats.coverage >= targetCoverage) {
        conclusion = "success";
    } else if (stats.coverage < minCoverage) {
        conclusion = "failure";
    } else {
        conclusion = "neutral";
    }

    const octokit = new Octokit();
    const head_commit = process.env.GITHUB_SHA;
    const eventPayload = require(process.env.GITHUB_EVENT_PATH);
    const repositoryId = eventPayload.repository.node_id;
    const loginName = eventPayload.repository.owner.login;

    octokit.checks.create({
        owner: loginName,
        repo: repositoryId,
        head_sha: head_commit, 
        name: "omegat-stats-report",
        status: "completed",
        conclusion: conclusion,
        output: {
            title: `${stats.coverage.toFixed(0)}% coverage.`,
            summary: stats.summary,
            text: stats.detail,
        },
    });
}

run();
