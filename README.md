# OmegaT statistics report Action

This action script check OmegaT project's statistics and report it.
When there specified a Github token, the action also add a comment to the commit.

## Usage


```yaml
uses: miurahr/omegat-stats-action@v1
with:
  token: ${{ secret.GITHUB_TOKEN }}
  min-coverage: 70.0
```
