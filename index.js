const t = TrelloPowerUp.iframe();

const GRAY_ICON = 'https://cdn.hyperdev.com/us-east-1%3A3d31b21c-01a0-4da2-8827-4bc6e88b7618%2Ficon-gray.svg';

const onBtnClick = function (t, opts) {
  return t.popup({
    title: 'Lancer une preview',
    url: './index.html', // URL of the popup
    height: 200
  });
};

window.TrelloPowerUp.initialize({
  'card-buttons': function (t, opts) {
    return [{
      icon: GRAY_ICON,
      text: 'Open Popup',
      callback: onBtnClick,
      condition: 'signedIn'
    }];
  }
});
