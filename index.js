const t = TrelloPowerUp.iframe();

t.render(function (secret, options) {
  document.getElementById('submit').addEventListener('click', function () {
    const ft = document.getElementById('ft').checked;
    const mabl = document.getElementById('mabl').checked;

    // Construct data to send (if needed)
    const data = {
      ft: ft,
      mabl: mabl
    };

    t.closePopup();
  });
});