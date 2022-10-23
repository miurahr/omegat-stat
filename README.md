# OmegaT statistics report Action

This action script check OmegaT project's `omegat/porject-stats.txt` and report it
as an output variable `coverage` in percent.
When specified a Github token, the action also add a comment to the commit.

## Usage

```yaml
uses: miurahr/omegat-stat@v1
with:
  token: ${{ secrets.GITHUB_TOKEN }}
  min-coverage: 30.0
  target-coverage: 70.0
```

## Screenshot

![Screenshot](https://raw.githubusercontent.com/miurahr/omegat-stat/main/img/omegat-stat-snapshot-progress-bar.png)

## Full example script

Here is a working example which can be added to any OmegaT team project.

```yaml
name: daily progress stat

on:
  schedule:
    - cron: '3 0 * * *' # every night
  workflow_dispatch:name: check progress

jobs:
  check_latest:
    runs-on: ubuntu-latest
    name: check latest commit
    outputs:
      should_run: $${{ steps.should_run.outputs.should_run }}
    steps:
      - uses: actions/checkout@v3
      - name: print latest commit
        run: echo ${{ github.sha }}
      - name: check latest commit less than a day
        id: should_run
        continue-on-error: true
        run: |
          test -z "$(git rev-list --after='24 hours' ${{ github.sha }})" && echo "should_run=false" >> $GITHUB_OUTPUT
          exit 0
 
  check-translation:
    runs-on: ubuntu-latest
    needs: check_latest
    if: ${{ needs.check_latest.outputs.should_run != 'false' }}
    name: Check translation progress
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v2
        with:
          java-version: 8
      - name: Prepare gradle config
        run: |
          echo "plugins { id 'org.omegat.gradle' version '1.5.9' }" > build.gradle
          echo "omegat {version='5.7.1'" >> build.gradle
          echo "projectDir='$rootDir'}" >> build.gradle
        shell: bash
      - name: Generate translation
        uses: gradle/gradle-build-action@v2
        with:
          arguments: translate
          gradle-version: 7.5.1
      - name: Report coverage
        uses: miurahr/omegat-stat@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          min-coverage: 50.0
          target-coverage: 80.0
```
