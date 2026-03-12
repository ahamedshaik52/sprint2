function autoFormatHandler(inputField) {
    if (!inputField) {
        console.error('Input field is required.');
        return;
    }

    const value = inputField.value;
    if (typeof value !== 'string') {
        console.error('Invalid input type. Expected a string.');
        return;
    }

    // Implement formatting logic
    const formattedValue = formatDate(value);
    inputField.value = formattedValue;
    console.log('Input field formatted to:', formattedValue);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format.');
        }
        return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch (error) {
        console.error('Error formatting date:', error.message);
        return dateString; // Return original string if formatting fails
    }
}