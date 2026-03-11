# Phone Number - Effective Date Auto-Population Setup Guide

## Overview

When a user opens the **Phone Number quick create form** (from the sub-grid on the **Person** table form), the **Effective Date** field should automatically populate with the **current system date**. The user can change the date before saving.

Below are **two approaches** to implement this:

---

## Approach 1: JavaScript Web Resource (Recommended)

### Step 1 — Upload the Web Resource

1. Open your Power Apps solution
2. Navigate to **Web Resources** → **New**
3. Configure:
   - **Display Name:** `Phone Number Quick Create Script`
   - **Name:** `cr_PhoneNumber_QuickCreate` (replace `cr` with your publisher prefix)
   - **Type:** `Script (JScript)`
4. Upload the file: `WebResources/js/PhoneNumber_QuickCreate.js`
5. Click **Save** and **Publish**

### Step 2 — Update the Field Logical Name

Open `WebResources/js/PhoneNumber_QuickCreate.js` and update the field logical name on this line:

```javascript
var EFFECTIVE_DATE_FIELD = "cr_effectivedate"; // <-- Change to your actual field logical name
```

To find your field's logical name:
1. Go to **Tables** → **Phone Number** → **Columns**
2. Find the **Effective Date** column
3. Copy the **Logical name** (e.g., `cr_effectivedate`, `new_effectivedate`, etc.)

### Step 3 — Register the OnLoad Event

1. Go to **Tables** → **Phone Number** → **Forms**
2. Open the **Quick Create Form**
3. Click **Form Properties** (in the form designer header)
4. Under **Event Handlers**, click **+ Add library**
5. Search for and add `cr_PhoneNumber_QuickCreate`
6. Under **Event Handlers** for the **OnLoad** event:
   - Click **+ Add**
   - **Library:** `cr_PhoneNumber_QuickCreate`
   - **Function:** `PhoneNumber.QuickCreate.onLoad`
   - **Pass execution context as first parameter:** ✅ **Checked**
7. Click **OK** → **Save** → **Publish**

### Step 4 — Test

1. Open a **Person** record
2. In the **Phone Number** sub-grid, click **+ New Phone Number**
3. The Quick Create form should open with **Effective Date** set to today's date
4. Verify you can change the date to a different value
5. Save and confirm the selected date is stored correctly

---

## Approach 2: North52 Business Rules Engine

If you have **North52** installed in your environment, you can achieve this without code.

### Step 1 — Create a North52 Formula

1. Open **North52** → **Formulas** → **New**
2. Configure the formula:

| Setting | Value |
|---------|-------|
| **Name** | `Phone Number - Set Effective Date to Today` |
| **Source Entity** | `Phone Number` (your phone number table) |
| **Source Property** | `Effective Date` |
| **Event** | `Create` |
| **Formula Type** | `Save - Client Side` |

3. In the **Formula Editor**, enter:

```
if(
    IsNull([phonenumber.cr_effectivedate]),
    Now(),
    [phonenumber.cr_effectivedate]
)
```

> **Note:** Replace `phonenumber` with your table's logical name and `cr_effectivedate` with your field's logical name.

### Step 2 — Alternative: Using "Set on Create" Formula Type

A simpler approach using North52:

1. Open **North52** → **Formulas** → **New**
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Auto-set Effective Date` |
| **Source Entity** | `Phone Number` |
| **Source Property** | `Effective Date` |
| **Event** | `Create` |
| **Formula Type** | `Client Side - Set Value on Form Load` |

3. Formula:

```
Now()
```

This will set the Effective Date to the current date/time when the form loads for a new record.

### Step 3 — Test

Same testing steps as the JavaScript approach above.

---

## Which Approach Should I Use?

| Criteria | JavaScript | North52 |
|----------|-----------|---------|
| **No additional licenses needed** | ✅ | ❌ (requires North52 license) |
| **No-code solution** | ❌ | ✅ |
| **Full control & customization** | ✅ | Limited |
| **Easier maintenance** | Moderate | ✅ |
| **Works on Quick Create forms** | ✅ | ✅ |

---

## Known Issue: CRM 9.1 On-Premises — Time Zone Independent DateTime Bug

If your **Effective Date** field uses **"Time Zone Independent"** behavior and you are running **Dynamics CRM 9.1 on-premises**, there is a [known bug](https://community.dynamics.com/blogs/post/?postid=ec5303b1-2541-4897-b82b-50515dd3da13) where DateTime fields display **one day behind** the actual value.

### What Happens

When you set a date on a Time Zone Independent field, CRM incorrectly subtracts the user's UTC timezone offset before displaying the value. For example, if you set the date to **March 11, 2026** and your timezone is UTC-5 (EST), the form may display **March 10, 2026**.

### Fix Option A: Client-Side (JavaScript)

In `WebResources/js/PhoneNumber_QuickCreate.js`, set the timezone fix flag to `true`:

```javascript
var APPLY_TIMEZONE_FIX = true; // Enable for CRM 9.1 on-premises TZ Independent bug
```

This adds the UTC offset to compensate for the incorrect subtraction.

### Fix Option B: Server-Side (Retrieve Plugin)

For a more comprehensive fix that corrects **all** Time Zone Independent fields on the entity (not just from this script), deploy the Retrieve plugin:

1. Build the plugin from `Plugins/FixTimeZoneIndependentDatetime.cs`
2. Register it using the **Plugin Registration Tool**:
   - **Message:** `Retrieve`
   - **Primary Entity:** Your phone number entity (e.g., `cr_phonenumber`)
   - **Stage:** Post-Operation (40)
   - **Execution Mode:** Synchronous
3. The plugin automatically detects all Time Zone Independent DateTime fields and adds the UTC offset back to correct the display

### Fix Option C: Change Field Behavior

If the field doesn't need to be Time Zone Independent, consider changing it to **"User Local"** or **"Date Only"** behavior. Note: once a field is set to Time Zone Independent, you cannot change it back through the UI. You must edit the solution XML directly (change `Behavior` value from `3` to `1`), re-import, and publish.

---

## Troubleshooting

- **Field not populating:** Verify the logical name in the script matches your field's actual logical name
- **Script not firing:** Ensure "Pass execution context as first parameter" is checked in the form event registration
- **Date shows wrong value (off by one day):** This is likely the CRM 9.1 Time Zone Independent bug — see the section above. Enable `APPLY_TIMEZONE_FIX = true` in the JS or deploy the Retrieve plugin
- **Date shows wrong value (other):** Check the user's timezone settings in Power Apps personalization settings
- **North52 formula not working:** Ensure the formula event is set to `Create` and the formula type supports client-side execution
