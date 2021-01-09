const core = require('@actions/core');
const github = require("@actions/github");
const fs = require('fs');

const token = core.getInput("token");
const minCoverage = parseFloat(core.getInput("min-Coverage") || "0.0");

const statsfile = "omegat/project_stats.txt";

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

function genDetail(data) {
    return "|  | Segments | Words | Characters(w/o spaces) | Characters(w/ spaces) | #Files |\n" +
           "| :-- | --: | --: | --: | --: | --: |\n" +
           makeRecord("Total", data, 1) + makeRecord("Remaining", data, 2) +
           makeRecord("Unique", data, 3) + makeRecord("Unique remaining", data, 4);
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

    try {
        data = fs.readFileSync(statsfile, 'utf8').toString();
        stats.source = parse(data,4, 1);
        stats.remain = parse(data, 5, 1);
        stats.sourceWOD = parse(data, 6, 1);
        stats.remainWOD = parse(data, 7, 1);
        let progress = stats.sourceWOD - stats.remainWOD
        stats.coverage = 100.0 * progress / stats.sourceWOD
        stats.summary = ` - translated ${progress} of ${stats.sourceWOD}(${stats.coverage.toFixed(2)}%)`;
        stats.detail = genDetail(data.split("\n\n")[1]);
        core.info(stats.summary);
        core.setOutput('coverage', stats.coverage.toString());
    } catch (error) {
        core.setFailed(error.message);
    }

    if (token && github.context.payload.head_commit) {
        let conclusion;
        if (!minCoverage) {
            conclusion = "neutral";
        } else if (stats.coverage >= minCoverage) {
            conclusion = "success";
        } else {
            conclusion = "failure";
        }
        github.getOctokit(token).checks.create({
            owner: github.context.payload.repository.owner.login,
            repo: github.context.payload.repository.name,
            name: "omegat-stats-report",
            head_sha: github.context.payload.head_commit.id,
            status: "completed",
            conclusion: conclusion,
            output: {
                title: `${stats.coverage.toFixed(0)}% coverage.`,
                summary: stats.summary + `, min-coverage: ${minCoverage}%`,
                text: stats.detail,
            },
        });
    }
}

run();
