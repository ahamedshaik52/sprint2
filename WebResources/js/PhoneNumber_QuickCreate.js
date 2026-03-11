// ============================================================
// Phone Number Quick Create Form - Effective Date Auto-Population
// ============================================================
// Purpose: Auto-populates the Effective Date field with the
//          current system date when the Phone Number quick
//          create form loads. Users can override the date.
// ============================================================
// Entity: Phone Number (sub-grid on Person table form)
// Form:   Quick Create Form
// Event:  Form OnLoad
// ============================================================

var PhoneNumber = PhoneNumber || {};

PhoneNumber.QuickCreate = (function () {
    "use strict";

    // --------------------------------------------------------
    // CONFIGURATION
    // Update the logical name below to match your environment.
    // --------------------------------------------------------
    var EFFECTIVE_DATE_FIELD = "cr_effectivedate"; // <-- Change prefix (cr_) to your publisher prefix

    /**
     * Form OnLoad handler.
     * Sets the Effective Date field to today's date if it is empty.
     *
     * @param {Object} executionContext - The execution context passed by the form event.
     */
    function onLoad(executionContext) {
        var formContext = executionContext.getFormContext();

        try {
            setEffectiveDateToToday(formContext);
        } catch (e) {
            console.error("PhoneNumber.QuickCreate.onLoad error: " + e.message);
        }
    }

    /**
     * Sets the Effective Date field to the current system date
     * only if the field is currently empty (null).
     * This allows users to change the date after it is populated.
     *
     * @param {Object} formContext - The form context.
     */
    function setEffectiveDateToToday(formContext) {
        var effectiveDateAttr = formContext.getAttribute(EFFECTIVE_DATE_FIELD);

        if (effectiveDateAttr === null || effectiveDateAttr === undefined) {
            console.warn(
                "PhoneNumber.QuickCreate: Field '" +
                    EFFECTIVE_DATE_FIELD +
                    "' not found on the form. " +
                    "Verify the logical name matches your environment."
            );
            return;
        }

        // Only set the date if the field is currently empty
        var currentValue = effectiveDateAttr.getValue();
        if (currentValue === null || currentValue === undefined) {
            var today = new Date();
            // Reset time to start of day to store date-only
            today.setHours(0, 0, 0, 0);

            effectiveDateAttr.setValue(today);

            // Fire OnChange to trigger any dependent business rules
            effectiveDateAttr.fireOnChange();
        }
    }

    // Public API
    return {
        onLoad: onLoad
    };
})();
