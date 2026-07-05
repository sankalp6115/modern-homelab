const savedIp = localStorage.getItem("backend_ip");
export const backend = savedIp ? savedIp : "localhost";
export const port = "8000";
