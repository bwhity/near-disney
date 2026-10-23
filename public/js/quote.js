// Quote form: works without JavaScript (plain POST + redirect back).
// With JavaScript it sends in the background and shows the result inline.
(function () {
  var form = document.getElementById("quote-form");
  if (!form) return;
  var sec = document.getElementById("quote");
  if (sec && sec.getAttribute("data-quote-live") === "false") return; // form switched off: fallback shown instead
  var status = form.querySelector(".form-status");
  var ci = form.elements.checkin, co = form.elements.checkout;
  form.elements.t.value = String(Date.now());

  var today = new Date().toISOString().slice(0, 10);
  ci.min = today; co.min = today;
  ci.addEventListener("change", function () {
    if (!ci.value) return;
    var d = new Date(ci.value + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
    co.min = d.toISOString().slice(0, 10);
    if (co.value && co.value <= ci.value) co.value = co.min;
  });

  var flag = new URLSearchParams(location.search).get("quote");
  if (flag === "sent") show("Thanks! Your quote request is on its way. We usually reply the same day.", "ok");
  if (flag === "error") show("Sorry, that did not send. Please message us on WhatsApp or email vacation@near-disney.com.", "err");

  function show(msg, kind) { status.textContent = msg; status.className = "form-status " + kind; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (co.value <= ci.value) { show("Check-out must be after check-in.", "err"); return; }
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true; show("Sending...", "");
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) {
        if (j.ok) { form.reset(); form.elements.t.value = String(Date.now()); show("Thanks! Your quote request is on its way. We usually reply the same day.", "ok"); }
        else show(j.error || "Sorry, that did not send. Please message us on WhatsApp.", "err");
      })
      .catch(function () { show("No connection. Please try again, or message us on WhatsApp.", "err"); })
      .then(function () { btn.disabled = false; });
  });
})();
