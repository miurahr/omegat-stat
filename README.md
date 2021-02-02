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

![Screenshot](https://raw.githubusercontent.com/miurahr/omegat-stat/main/img/omegat-stat-snapshost-progress-bar.png)

## Full example script

Here is a working example which can be added to any OmegaT team project.

```yaml
name: check progress
on: push
jobs:
  check-translation:
    runs-on: ubuntu-20.04
    name: Check translation progress
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v1
        with:
          java-version: 8
      - name: Prepare gradle config
        run: echo "plugins { id 'org.omegat.gradle' version '1.4.2' }" > build.gradle
        shell: bash
      - name: Generate translation
        uses: burrunan/gradle-cache-action@v1
        with:
          arguments: translate
          gradle-version: 6.7.1
      - name: Report coverage
        uses: miurahr/omegat-stat@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          min-coverage: 50.0
          target-coverage: 80.0
```
