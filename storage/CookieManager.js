var fiveYearsInDays = 1825;

function createCookie(name, value, days) {
  var expires;

  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toGMTString();
  } else {
    expires = "";
  }
  document.cookie = escape(name) + "=" + escape(value) + expires + "; path=/";
}

function createNonExpiringCookie(name, value) {
  createCookie(name, value, fiveYearsInDays);
}

function readCookie(name) {
  var nameEQ = escape(name) + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === ' ' || c.charAt(0) === ',') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return escape(c.substring(nameEQ.length, c.length));
  }
  return null;
}

function deleteCookie(name) {
  createCookie(name, "", -1);
}

module.exports = {
  createNonExpiringCookie: createNonExpiringCookie,
  read: readCookie,
  delete: deleteCookie
};
