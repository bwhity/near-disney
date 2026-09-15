function startSlideshow(root, folder, count) {
  const stage = root.querySelector(".stage");
  const dots = root.querySelector(".dots");
  const files = [];
  for (let i = 1; i <= count; i++) {
    const n = String(i).padStart(2, "0");
    files.push("../images/" + folder + "/" + n + ".jpg");
  }
  files.forEach((src, i) => {
    const img = new Image();
    img.src = src;
    img.alt = folder + " photo " + (i + 1);
    if (i === 0) img.className = "on";
    img.onerror = function () {
      this.replaceWith(Object.assign(document.createElement("div"), {
        className: (i === 0 ? "ph on" : "ph"),
        textContent: "Add " + (i + 1) + ".jpg"
      }));
    };
    stage.appendChild(img);
    const d = document.createElement("button");
    d.type = "button";
    if (i === 0) d.className = "on";
    d.onclick = () => go(i);
    dots.appendChild(d);
  });
  let n = 0;
  function slides() { return [...stage.children]; }
  function go(i) {
    const s = slides();
    n = (i + s.length) % s.length;
    s.forEach((el, x) => el.classList.toggle("on", x === n));
    [...dots.children].forEach((el, x) => el.classList.toggle("on", x === n));
  }
  root.querySelector(".prev").onclick = () => go(n - 1);
  root.querySelector(".next").onclick = () => go(n + 1);
  setInterval(() => go(n + 1), 6000);
}
