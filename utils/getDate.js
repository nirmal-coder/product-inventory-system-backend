function formatDate12(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");

  // Convert UTC → IST
  const istOffset = 5 * 60 + 30; // +5:30 in minutes
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + istOffset * 60000);

  let hours = istDate.getHours();
  const minutes = pad(istDate.getMinutes());
  const seconds = pad(istDate.getSeconds());

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  const day = pad(istDate.getDate());
  const month = pad(istDate.getMonth() + 1);
  const year = istDate.getFullYear();

  return `${day}/${month}/${year} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
}

module.exports = formatDate12;
