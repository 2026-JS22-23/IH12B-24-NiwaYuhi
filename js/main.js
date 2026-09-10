// 小牧観光案内 - 地図とスポット表示
// Google Maps API + jQuery UI

// 地図本体
var map;
// 情報ウィンドウ（1つ使いまわす）
var infoWindow;
// マーカーを入れておく配列
var markers = [];
// いま選んでいるカテゴリ（all / history / shrine / nature）
var nowFilter = 'all';

// カテゴリごとのピンの色
var pinColors = {
  history: '#1f4a3a',
  shrine: '#c45c3e',
  nature: '#b8893d',
};

// ----------------------------------------------------------
// id からスポットのデータを探す
// ----------------------------------------------------------
function getSpotById(id) {
  for (var i = 0; i < SPOTS.length; i++) {
    if (SPOTS[i].id == id) {
      return SPOTS[i];
    }
  }
  return null;
}

// 今の時間が開館時間かどうか
function isOpenNow(spot) {
  var now = new Date();
  var week = now.getDay(); // 0=日 〜 6=土
  var hour = now.getHours() + now.getMinutes() / 60;
  var i;

  // 休みの曜日なら時間外
  for (i = 0; i < spot.open.closedWeekdays.length; i++) {
    if (spot.open.closedWeekdays[i] == week) {
      return false;
    }
  }

  if (hour >= spot.open.start && hour < spot.open.end) {
    return true;
  }
  return false;
}

// マーカーのピン画像を作る
function pinIcon(color) {
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">' +
    '<path fill="' +
    color +
    '" d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z"/>' +
    '<circle fill="#fffdf8" cx="18" cy="18" r="7"/></svg>';

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(28, 38),
    anchor: new google.maps.Point(14, 38),
  };
}

// 情報ウィンドウの中身（写真・説明）
function makeInfoHtml(spot) {
  var html = '';
  html += '<div class="info-window">';
  html += '<img src="' + spot.image + '" alt="' + spot.name + '">';
  html += '<h3>' + spot.name + '</h3>';
  html += '<p>' + spot.catch + '</p>';
  html += '<p>' + spot.summary + '</p>';
  html += '<p>' + spot.address + '</p>';
  html +=
    '<button type="button" class="info-detail" data-id="' +
    spot.id +
    '">詳しく見る</button>';
  html += '</div>';
  return html;
}

// 地図をそのスポットへ動かして、情報ウィンドウを開く
function openInfo(spot) {
  var i;

  if (!map) {
    openDialog(spot);
    return;
  }

  // 地図の中心をスポットの位置へ
  map.panTo({ lat: spot.lat, lng: spot.lng });
  map.setZoom(15);

  // 同じ id のマーカーを探して情報ウィンドウを開く
  for (i = 0; i < SPOTS.length; i++) {
    if (SPOTS[i].id == spot.id) {
      infoWindow.setContent(makeInfoHtml(spot));
      infoWindow.open(map, markers[i]);
      break;
    }
  }

  // 一覧の選択状態
  $('.spot-card').removeClass('is-active');
  $('.spot-card[data-id="' + spot.id + '"]').addClass('is-active');
}

// jQuery UI のダイアログで詳しく表示
function openDialog(spot) {
  var html = '';
  var i;
  var note = '';

  if (spot.imageNote) {
    note = '<p>' + spot.imageNote + '</p>';
  }

  html +=
    '<img class="dialog-hero" src="' +
    spot.image +
    '" alt="' +
    spot.name +
    '">';
  html += note;
  html += '<p><strong>' + spot.catch + '</strong></p>';
  html += '<div class="highlights">';
  for (i = 0; i < spot.highlights.length; i++) {
    html += '<span>' + spot.highlights[i] + '</span>';
  }
  html += '</div>';

  // アコーディオン用
  html += '<div id="spot-accordion">';
  html += '<h3>紹介</h3>';
  html += '<div><p>' + spot.summary + '</p><p>' + spot.detail + '</p></div>';
  html += '<h3>アクセス</h3>';
  html += '<div><p>' + spot.address + '</p><p>' + spot.access + '</p></div>';
  html += '<h3>時間・料金</h3>';
  html +=
    '<div><p>' +
    spot.hours +
    '</p><p>' +
    spot.fee +
    '</p><p>' +
    spot.holiday +
    '</p></div>';
  html += '</div>';

  $('#dialog-body').html(html);

  // アコーディオンを作る
  $('#spot-accordion').accordion({
    heightStyle: 'content',
    collapsible: true,
  });

  // ダイアログのタイトルをスポット名にして開く
  $('#spot-dialog').dialog('option', 'title', spot.name);
  $('#spot-dialog').dialog('open');
}

// 左のスポット一覧を表示する
function showList() {
  var html = '';
  var i;
  var spot;
  var openText;
  var openClass;

  for (i = 0; i < SPOTS.length; i++) {
    spot = SPOTS[i];

    // カテゴリが違うものは出さない
    if (nowFilter != 'all' && spot.category != nowFilter) {
      continue;
    }

    if (isOpenNow(spot)) {
      openText = '開館目安';
      openClass = 'open';
    } else {
      openText = '時間外目安';
      openClass = 'closed';
    }

    html += '<li class="spot-card" data-id="' + spot.id + '">';
    html += '<img src="' + spot.image + '" alt="' + spot.name + '">';
    html += '<div>';
    html += '<h3>' + spot.name + '</h3>';
    html += '<p>' + spot.catch + '</p>';
    html += '<div class="spot-meta">';
    html += '<span class="badge">' + spot.categoryLabel + '</span>';
    html += '<span class="badge ' + openClass + '">' + openText + '</span>';
    html += '</div>';
    html += '<div class="spot-actions">';
    html += '<button type="button" class="btn-map">地図で見る</button>';
    html += '<button type="button" class="btn-detail">詳しく</button>';
    html += '</div></div></li>';
  }

  $('#spot-list').html(html);

  // ボタンを jQuery UI の見た目にする
  $('#spot-list .btn-map, #spot-list .btn-detail').button();
}

// 表示中のスポットに合わせて地図の範囲を合わせる
function fitMap() {
  var bounds;
  var count;
  var i;
  var spot;

  if (!map) {
    return;
  }

  bounds = new google.maps.LatLngBounds();
  count = 0;

  for (i = 0; i < SPOTS.length; i++) {
    spot = SPOTS[i];
    if (nowFilter == 'all' || spot.category == nowFilter) {
      bounds.extend({ lat: spot.lat, lng: spot.lng });
      count = count + 1;
    }
  }

  if (count > 1) {
    map.fitBounds(bounds, 64);
  } else if (count == 1) {
    for (i = 0; i < SPOTS.length; i++) {
      spot = SPOTS[i];
      if (nowFilter == 'all' || spot.category == nowFilter) {
        map.setCenter({ lat: spot.lat, lng: spot.lng });
        map.setZoom(15);
        break;
      }
    }
  }
}

// タブで選んだカテゴリを一覧とマーカーに反映する
function applyFilter() {
  var i;
  var show;

  showList();

  for (i = 0; i < markers.length; i++) {
    show = false;
    if (nowFilter == 'all' || SPOTS[i].category == nowFilter) {
      show = true;
    }
    markers[i].setVisible(show);
  }

  if (infoWindow) {
    infoWindow.close();
  }

  fitMap();
}

// おすすめコースを表示する
function showCourses() {
  var html = '';
  var i;
  var j;
  var course;
  var spot;

  for (i = 0; i < COURSES.length; i++) {
    course = COURSES[i];

    html += '<article class="course-card" data-course="' + course.id + '">';
    html += '<h3>' + course.title + '</h3>';
    html += '<p>' + course.time + '</p>';
    html += '<div class="course-path">';

    for (j = 0; j < course.spots.length; j++) {
      spot = getSpotById(course.spots[j]);
      html += '<span>' + spot.name + '</span>';
    }

    html += '</div>';
    html += '<p>' + course.text + '</p>';
    html += '<button type="button">このコースを地図で見る</button>';
    html += '</article>';
  }

  $('#course-grid').html(html);
  $('#course-grid button').button();
}

// コースを地図で見る
function showCourse(courseId) {
  var course;
  var bounds;
  var i;
  var spot;

  course = null;
  for (i = 0; i < COURSES.length; i++) {
    if (COURSES[i].id == courseId) {
      course = COURSES[i];
      break;
    }
  }

  if (!course || !map) {
    return;
  }

  // いったん「すべて」に戻す
  nowFilter = 'all';
  $('#category-tabs').tabs('option', 'active', 0);
  applyFilter();

  // コース上のスポットが全部見えるようにする
  bounds = new google.maps.LatLngBounds();
  for (i = 0; i < course.spots.length; i++) {
    spot = getSpotById(course.spots[i]);
    bounds.extend({ lat: spot.lat, lng: spot.lng });
  }
  map.fitBounds(bounds, 80);

  // 最初のスポットの情報ウィンドウを開く
  openInfo(getSpotById(course.spots[0]));
}

// 地図の初期化（Google Maps が読み込まれたら呼ばれる）
function initMap() {
  var i;
  var spot;
  var marker;
  var komaki;

  $('#map-fallback').prop('hidden', true);

  // 地図の中心は小牧山
  komaki = { lat: 35.2925, lng: 136.91361 };

  map = new google.maps.Map(document.getElementById('map'), {
    center: komaki,
    zoom: 13,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#ebe3d7' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#5b5348' }] },
      { featureType: 'water', stylers: [{ color: '#b7c9c2' }] },
      { featureType: 'poi.park', stylers: [{ color: '#c5d5c0' }] },
      { featureType: 'road', stylers: [{ color: '#f5efe6' }] },
      { featureType: 'road.highway', stylers: [{ color: '#ead7b3' }] },
    ],
  });

  // 情報ウィンドウを1つ用意する
  infoWindow = new google.maps.InfoWindow();

  // スポットの数だけマーカーを置く
  for (i = 0; i < SPOTS.length; i++) {
    spot = SPOTS[i];

    marker = new google.maps.Marker({
      position: { lat: spot.lat, lng: spot.lng },
      map: map,
      title: spot.name,
      icon: pinIcon(pinColors[spot.category]),
      animation: google.maps.Animation.DROP,
    });

    // マーカーをクリックしたら情報ウィンドウを開く
    // （クロージャ対策で、そのときの spot を渡す）
    (function (target) {
      marker.addListener('click', function () {
        openInfo(target);
      });
    })(spot);

    markers.push(marker);
  }

  fitMap();

  // 情報ウィンドウの「詳しく見る」ボタン
  infoWindow.addListener('domready', function () {
    $('.info-detail').click(function () {
      var id = $(this).data('id');
      var target = getSpotById(id);
      openDialog(target);
    });
  });
}

// initMap をグローバルに公開（callback から呼ばれるため）
window.initMap = initMap;

// Google Maps API を読み込む
function loadGoogleMaps() {
  var script;

  // キーが無いときは案内を出す
  if (!GOOGLE_MAPS_API_KEY) {
    $('#map-fallback').prop('hidden', false);
    return;
  }

  script = document.createElement('script');
  script.src =
    'https://maps.googleapis.com/maps/api/js?key=' +
    GOOGLE_MAPS_API_KEY +
    '&callback=initMap&language=ja';
  script.async = true;
  script.defer = true;
  script.onerror = function () {
    $('#map-fallback').prop('hidden', false);
  };
  document.head.appendChild(script);
}

// ページを読み込んだあとの処理
$(document).ready(function () {
  // タブ（すべて / 歴史 / 寺社 / 自然・文化）
  $('#category-tabs').tabs({
    activate: function (event, ui) {
      var href = ui.newTab.find('a').attr('href');

      if (href == '#tab-all') {
        nowFilter = 'all';
      } else if (href == '#tab-history') {
        nowFilter = 'history';
      } else if (href == '#tab-shrine') {
        nowFilter = 'shrine';
      } else if (href == '#tab-nature') {
        nowFilter = 'nature';
      } else {
        nowFilter = 'all';
      }

      applyFilter();
    },
  });

  // ダイアログ（最初は閉じたまま）
  $('#spot-dialog').dialog({
    autoOpen: false,
    modal: true,
    width: Math.min(560, window.innerWidth - 32),
    maxHeight: window.innerHeight - 40,
  });

  // 一覧とコースを出す
  showList();
  showCourses();

  // ヘッダーのボタンを jQuery UI の見た目にする
  $('.btn-primary, .btn-ghost').button();

  // 一覧クリック（後から作る要素なので委譲する）
  $('#spot-list').on('click', '.spot-card', function (event) {
    var id = $(this).data('id');
    var spot = getSpotById(id);

    // 「詳しく」ボタンならダイアログ
    if ($(event.target).closest('.btn-detail').length) {
      event.preventDefault();
      openDialog(spot);
      return;
    }

    // それ以外は地図で情報ウィンドウ
    openInfo(spot);
  });

  // コースのボタン
  $('#course-grid').on('click', 'button', function () {
    var courseId = $(this).closest('.course-card').data('course');
    showCourse(courseId);
    document
      .getElementById('map-section')
      .scrollIntoView({ behavior: 'smooth' });
  });

  // 地図を読み込む
  loadGoogleMaps();
});
