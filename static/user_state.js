let currentUser = null;

export function setUser(data) {
    currentUser = data;
}

export function clearUser() {
    currentUser = null;
}

export function getUser() {
    return currentUser;
}