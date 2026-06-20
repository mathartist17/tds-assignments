## Notes

- First get the commit where any timeout operation was performed
`git log --oneline | grep "timeout"`
- Then use git show for the output of all the above commit hashes
`git show b89e510`
- For the hash where the timeout was updated to 360, fetch its parent commit hash
`git log --pretty=%P -n 1 b89e510`
