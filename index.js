const core = require('@actions/core');
const github = require("@actions/github");
const fs = require('fs');

const token = core.getInput("token");
const minCoverage = parseFloat(core.getInput("min-Coverage") || "0.0");

const statsfile = "omegat/project_stats.txt";

function parse(data, line) {
    return parseInt(data.split("\n")[line].split("\t")[1]);
}

async function run() {
    let data;
    const statistics = {
        sourceCount: 0,
        targetCount: 0,
        sourceCountWOD: 0,
        targetCountWOD: 0,
        summary: "",
        coverage: 0,
    };

    try {
        data = fs.readFileSync(statsfile, 'utf8').toString();
        statistics.sourceCount = parse(data,4);
        statistics.targetCount = parse(data, 5);
        statistics.sourceCountWOD = parse(data, 6);
        statistics.targetCountWOD = parse(data, 7);
        statistics.coverage = statistics.targetCountWOD / statistics.sourceCountWOD * 100
        statistics.summary = ` - " translated ${statistics.targetCountWOD} of ${statistics.sourceCountWOD}: total ${statistics.coverage}% w/o duplication.`;
        core.info(statistics.summary);
        core.setOutput('coverage', statistics.coverage.toString());
    } catch (error) {
        core.setFailed(error.message);
    }

    if (token && github.context.payload.head_commit) {
        let conclusion;
        if (!minCoverage) {
            conclusion = "neutral";
        } else if (statistics.coverage >= minCoverage) {
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
            conclusion,
            output: {
                title: `${statistics.coverage.toFixed(0)}% coverage.`,
                summary: statistics.summary + `, min-coverage: ${minCoverage}%`,
                text: data,
            },
        });
    }
}

run();
