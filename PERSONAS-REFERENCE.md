# Personas Reference for Scripted Runs

## Canonical Persona IDs

Based on the persona definitions in `backend/data/personas/`, we have **5 personas** for scripted runs:

### 1. Impatient New User
- **ID**: `impatient_new_user`
- **Display Name**: Impatient First-Time User
- **Description**: New user who wants quick results, skips reading, and gets frustrated by unclear flows
- **Key Traits**: Low patience, skimming, trial-and-error, fast pace, high frustration tolerance
- **Behavior**: Skips most text, tries obvious actions first, impatient with slow feedback

### 2. Methodical Evaluator
- **ID**: `methodical_evaluator`
- **Display Name**: Methodical Evaluator
- **Description**: Careful evaluator who reads most content, compares options, and double-checks before committing
- **Key Traits**: Deep reader, high patience, prefers documentation, low risk tolerance
- **Behavior**: Reads key headings and helper text, compares options, avoids unclear decisions

### 3. Power User Explorer
- **ID**: `power_user_explorer`
- **Display Name**: Exploratory Power User
- **Description**: Tech-savvy user who explores advanced features, shortcuts, and non-obvious flows
- **Key Traits**: Exploratory, high risk tolerance, trial-and-error, seeks advanced settings
- **Behavior**: Looks for shortcuts, experiments with edge cases, prefers efficient paths

### 4. Privacy Skeptic
- **ID**: `privacy_skeptic`
- **Display Name**: Skeptical Privacy-Conscious User
- **Description**: User highly sensitive about data sharing and permissions, reluctant to grant broad access
- **Key Traits**: Deep reader, cautious, prefers docs, very low risk tolerance
- **Behavior**: Carefully reads privacy/permission copy, prefers most private options, calls out vague language

### 5. Accessibility Screen Reader
- **ID**: `accessibility_screen_reader`
- **Display Name**: Accessibility-First Screen Reader User
- **Description**: User who primarily relies on keyboard navigation and screen reader semantics
- **Key Traits**: Balanced reader, keyboard-only, high accessibility sensitivity
- **Behavior**: Uses keyboard navigation, relies on labels and landmarks, flags poor focus management

## Implementation Status

- ⏳ **impatient_new_user**: Needs scripted JSON implementation
- ⏳ **methodical_evaluator**: Needs scripted JSON implementation
- ⏳ **power_user_explorer**: Needs scripted JSON implementation  
- ⏳ **privacy_skeptic**: Needs scripted JSON implementation
- ⏳ **accessibility_screen_reader**: Needs scripted JSON implementation

## Notes

- All 5 personas will get JSON-driven scripted flows for reliable demo videos
- Each persona will have scripts for both V1 and (later) V2 UI versions
- Scripts will be grouped by `run_group_id` for batch execution
- Persona definitions are sourced from `backend/data/personas/*.json`

