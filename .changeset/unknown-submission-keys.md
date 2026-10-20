---
"@ourform/validation": minor
---

Add ValidateSubmissionOptions.unknownKeys (`reject` by default, opt-in `strip`). Strip filters unknown
object-scope keys before shared runtime/provider validation without mutating the submission; unsafe
JSON and invalid declared values remain rejected.
