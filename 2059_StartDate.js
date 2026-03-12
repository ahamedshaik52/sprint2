function effectiveDateHandler() {
    const effectiveDateInput = document.querySelector('[aria-label="Effective Date"]');
    if (effectiveDateInput) {
        const formatDate = (input) => {
            return input.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
        };
        const autoFormatHandler = (e) => {
            if (['Tab', 'Enter', 'focusout', 'paste'].includes(e.type)) {
                effectiveDateInput.value = formatDate(effectiveDateInput.value);
            }
        };
        effectiveDateInput.addEventListener('focusout', autoFormatHandler);
        effectiveDateInput.addEventListener('paste', autoFormatHandler);
        effectiveDateInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' || e.key === 'Enter') {
                autoFormatHandler(e);
            }
        });
    }
}

// Existing Functions
function autoFormatHandler() {
    // Existing function code
}

function formatDate() {
    // Existing function code
}

effectiveDateHandler();