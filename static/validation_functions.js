export function email(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // const regex = /^[a-zA-Z0-9._%+-]+@clinic.pk/
    return regex.test(email);
}

export function formatPhoneInput(input) {
    let raw = input.value;

    // Prevent deleting "+92 "
    if (!raw.startsWith("+92")) {
        raw = "+92 ";
    }
    if (raw === "+92") {
        raw = "+92 ";
    }

    // Remove everything except digits (keep + for prefix check)
    let digits = raw.replace(/\D/g, "");

    // Make sure it always starts with 92
    if (!digits.startsWith("92")) {
        digits = "92" + digits;
    }

    // Limit to 12 digits total (92 + 10-digit number)
    digits = digits.slice(0, 12);

    // Extract parts
    const code = digits.slice(2, 5);
    const number = digits.slice(5);

    // Build formatted output
    let formatted = "+92";

    if (code.length > 0) formatted += " " + code;
    if (number.length > 0) formatted += "-" + number;

    input.value = formatted;
}

export function formatCNICInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value.length > 13) {
        value = value.substring(0, 13);
    }
    let formattedValue = '';
    if (value.length > 0) {
        formattedValue = value;
        if (value.length > 5) {
            formattedValue = formattedValue.substring(0, 5) + '-' + formattedValue.substring(5);
        }
        if (value.length > 12) {
            formattedValue = formattedValue.substring(0, 13) + '-' + formattedValue.substring(13);
        }
    }
    input.value = formattedValue;
}

export function vitalsInput(input) {
    const value = input.value;
    let isValid = true;
    let errorMsg = '';

    // Simple BP format check
    if (input.id.includes('vitals-bp')) {
        if (!/^\d{2,3}\/\d{2,3}$/.test(value)) {
            isValid = false;
            errorMsg = 'Blood pressure must be in the format 120/80';
        }
    }


    if (!isValid) {
        input.classList.add('border-red-500');
        input.setAttribute('title', errorMsg);
    } else {
        input.classList.remove('border-red-500');
        input.removeAttribute('title');
    }

    return isValid;
}