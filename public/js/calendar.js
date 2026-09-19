function startCalendar(root, opts) {
  const title = root.querySelector(".cal-title");
  const grid = root.querySelector(".cal-grid");
  const rangeEl = root.querySelector(".cal-range");
  const wa = root.querySelector(".cal-wa");
  const mail = root.querySelector(".cal-mail");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let view = new Date();
  view.setDate(1);
  let start = null;
  let end = null;

  function ymd(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function label(d) {
    return months[d.getMonth()].slice(0, 3) + " " + d.getDate() + ", " + d.getFullYear();
  }
  function inRange(d) {
    if (!start || !end) return false;
    const t = d.setHours(0,0,0,0);
    return t >= start.getTime() && t <= end.getTime();
  }
  function updateLinks() {
    if (!start) {
      rangeEl.textContent = "Tap an arrival date, then a departure date.";
      return;
    }
    const arrive = label(start);
    const depart = end ? label(end) : "(choose departure)";
    rangeEl.textContent = end ? (arrive + " → " + depart) : ("Arrive " + arrive + ". Now choose departure.");
    const q = encodeURIComponent("Hi — are " + opts.home + " dates open " + arrive + (end ? " to " + depart : "") + "?");
    wa.href = "https://wa.me/15085071559?text=" + q;
    mail.href = "mailto:vacation@near-disney.com?subject=" + encodeURIComponent(opts.home + " dates") + "&body=" + q;
  }
  function pick(iso) {
    const d = new Date(iso + "T00:00:00");
    if (!start || (start && end) || d < start) {
      start = d;
      end = null;
    } else {
      end = d;
    }
    draw();
  }
  function draw() {
    title.textContent = months[view.getMonth()] + " " + view.getFullYear();
    grid.innerHTML = "";
    days.forEach(function (name) {
      const h = document.createElement("div");
      h.className = "cal-dow";
      h.textContent = name;
      grid.appendChild(h);
    });
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const last = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    for (let i = 0; i < first.getDay(); i++) {
      grid.appendChild(document.createElement("div"));
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(view.getFullYear(), view.getMonth(), day);
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = day;
      const iso = ymd(d);
      b.dataset.iso = iso;
      if (d < today) b.disabled = true;
      if (start && ymd(start) === iso) b.classList.add("sel");
      if (end && ymd(end) === iso) b.classList.add("sel");
      if (start && end && d > start && d < end) b.classList.add("mid");
      b.addEventListener("click", function () { pick(iso); });
      grid.appendChild(b);
    }
    updateLinks();
  }
  root.querySelector(".cal-prev").addEventListener("click", function () {
    view.setMonth(view.getMonth() - 1);
    draw();
  });
  root.querySelector(".cal-next").addEventListener("click", function () {
    view.setMonth(view.getMonth() + 1);
    draw();
  });
  draw();
}
