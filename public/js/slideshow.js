function startSlideshow(root, folder, count) {
  const stage = root.querySelector(".stage");
  const dots = root.querySelector(".dots");
  for (let i = 1; i <= count; i++) {
    const src = "../images/" + folder + i + ".jpg";
    const img = new Image();
    img.src = src;
    img.alt = folder + i;
    if (i === 1) img.className = "on";
    img.onerror = function () {
      const ph = document.createElement("div");
      ph.className = i === 1 ? "ph on" : "ph";
      ph.textContent = folder + i + ".jpg missing";
      this.replaceWith(ph);
    };
    stage.appendChild(img);
    const d = document.createElement("button");
    d.type = "button";
    if (i === 1) d.className = "on";
    d.addEventListener("click", function () { go(i - 1); });
    dots.appendChild(d);
  }
  let n = 0;
  function slides() { return [...stage.children]; }
  function go(i) {
    const s = slides();
    n = (i + s.length) % s.length;
    s.forEach(function (el, x) { el.classList.toggle("on", x === n); });
    [...dots.children].forEach(function (el, x) { el.classList.toggle("on", x === n); });
  }
  root.querySelector(".prev").addEventListener("click", function () { go(n - 1); });
  root.querySelector(".next").addEventListener("click", function () { go(n + 1); });
  setInterval(function () { go(n + 1); }, 6000);
}
