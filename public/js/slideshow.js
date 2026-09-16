function startSlideshow(root, dir, prefix, ext, max) {
  const stage = root.querySelector(".stage");
  const dots = root.querySelector(".dots");
  const slots = [];
  const slides = [];
  let n = 0;
  let pending = max;

  function go(i) {
    if (!slides.length) return;
    n = (i + slides.length) % slides.length;
    slides.forEach(function (el, x) { el.classList.toggle("on", x === n); });
    [...dots.children].forEach(function (el, x) { el.classList.toggle("on", x === n); });
  }

  function render() {
    stage.innerHTML = "";
    dots.innerHTML = "";
    slides.length = 0;
    for (let i = 1; i <= max; i++) {
      if (!slots[i]) continue;
      const img = slots[i];
      img.classList.toggle("on", slides.length === 0);
      stage.appendChild(img);
      const d = document.createElement("button");
      d.type = "button";
      if (slides.length === 0) d.className = "on";
      const idx = slides.length;
      d.addEventListener("click", function () { go(idx); });
      dots.appendChild(d);
      slides.push(img);
    }
    n = 0;
  }

  function tryNames(i, names, k) {
    if (k >= names.length) {
      pending -= 1;
      if (pending === 0) render();
      return;
    }
    const img = new Image();
    img.alt = prefix + i;
    img.addEventListener("load", function () {
      slots[i] = img;
      pending -= 1;
      render();
    });
    img.addEventListener("error", function () { tryNames(i, names, k + 1); });
    img.src = names[k];
  }

  for (let i = 1; i <= max; i++) {
    tryNames(i, [
      "../images/" + dir + "/" + prefix + i + ext,
      "../images/" + dir + "/" + prefix + " " + i + ext,
      "../images/" + dir + "/" + prefix + i + ".jpg",
      "../images/" + dir + "/" + prefix + " " + i + ".jpg"
    ], 0);
  }

  root.querySelector(".prev").addEventListener("click", function () { go(n - 1); });
  root.querySelector(".next").addEventListener("click", function () { go(n + 1); });
  setInterval(function () { go(n + 1); }, 6000);
}
