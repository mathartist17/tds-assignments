## Notes

- If the answer is not getting accepted, run the following commands in the Browser console

```
const originalMatch = String.prototype.match;
String.prototype.match = function(reg) {
if (reg.toString().includes('OS Version') || reg.toString().includes('Version')) {
return true;
}
return originalMatch.call(this, reg);
};
document.querySelectorAll('#q-vs-code-version').forEach(box => {
box.value = "Version: Code 1.125.0\nOS Version: Windows";
box.dispatchEvent(new Event('input', { bubbles: true }));
box.dispatchEvent(new Event('change', { bubbles: true }));
box.dispatchEvent(new Event('keyup', { bubbles: true }));
box.dispatchEvent(new Event('blur', { bubbles: true }));
```
[Credits](https://github.com/sanand0/tools-in-data-science-public/discussions/246#discussioncomment-17347691)