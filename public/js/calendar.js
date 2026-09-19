function startCalendar(root, booked, contact) {
  booked = booked || [];
  const title = root.querySelector(".cal-title");
  const grid = root.querySelector(".cal-grid");
  let view = new Date();
  view.setDate(1);

  function ymd(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function inBooked(day) {
    const t = ymd(day);
    return booked.some(function (r) {
      const a = r.start || r;
      const b = r.end || r.start || r;
      return t >= a && t <= b;
    });
  }
  function paint() {
    const y = view.getFullYear();
    const m = view.getMonth();
    title.textContent = view.toLocaleString("en", { month: "long", year: "numeric" });
    grid.innerHTML = "";
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(function (d) {
      const el = document.createElement("div");
      el.className = "dow";
      el.textContent = d;
      grid.appendChild(el);
    });
    const first = new Date(y, m, 1);
    for (let i = 0; i < first.getDay(); i++) {
      const blank = document.createElement("div");
      blank.className = "blank";
      grid.appendChild(blank);
    }
    const last = new Date(y, m + 1, 0).getDate();
    const today = ymd(new Date());
    for (let day = 1; day <= last; day++) {
      const dt = new Date(y, m, day);
      const key = ymd(dt);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = day;
      if (key < today) btn.className = "past";
      else if (inBooked(dt)) btn.className = "busy";
      else btn.className = "open";
      btn.addEventListener("click", function () {
        if (btn.className === "past") return;
        const q = encodeURIComponent("Hi - are " + key + " available at the " + (contact.place || "home") + "?");
        if (contact.wa) window.open(contact.wa + q, "_blank");
      });
      grid.appendChild(btn);
    }
  }
  root.querySelector(".cal-prev").addEventListener("click", function () {
    view.setMonth(view.getMonth() - 1);
    paint();
  });
  root.querySelector(".cal-next").addEventListener("click", function () {
    view.setMonth(view.getMonth() + 1);
    paint();
  });
  paint();
}
