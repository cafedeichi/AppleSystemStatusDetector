---
name: OpenAPI
about: OpenAPI Definition Updates  

---

## Background
<!-- Please note what you did in this pull request and related links, such as JIRA stories. -->

## Checklist
- [ ] Updated the version number.
    - It can be approvable even if it causes a conflict as long as the number is increased.
- [ ] Added `required` or `nullable`.
    - `required` should be added to new parameters, basically.
- [ ] Defined enums.
    - Be careful with auto-generated classes that have newly defined enums, and avoid using integer enums, as they might cause a JSON parsing error.
    - Adding enums to existing definitions later might also cause a JSON parsing error.
- [ ] Added titles to main parameters.
    - Avoid omitting them to prevent the automatic generation of class names that do not follow the naming rules.
- [ ] Added `description` and an `example`.
    - `description` is required to elaborate on the role.
    - Providing an example is also preferable.
