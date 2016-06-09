(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/main/main.html", {
        ready: function (element, options) {
            var datesDiv = document.querySelector("#datesListView");
            var splitView = document.querySelector(".splitView").winControl;

            //chowanie zawartości splitView
            splitView.addEventListener("beforeopen", function (eventInfo) {
                datesDiv.style.visibility = "visible";
            });
            splitView.addEventListener("beforeclose", function (eventInfo) {
                datesDiv.style.visibility = "hidden";
            });


            //bindowanie dat
            var listViewControl = datesDiv.winControl;
            listViewControl.itemDataSource = datesBindingList.dataSource;
            listViewControl.itemTemplate = document.querySelector("#dataTemple");
            listViewControl.addEventListener("iteminvoked", this.updateCurrenciesCoursesEvent);

            //bindowanie kursów
            coursesViewControl = document.querySelector("#coursesListView").winControl;
            coursesViewControl.itemDataSource = curses.dataSource;
            coursesViewControl.itemTemplate = document.querySelector("#courseTemple");
            coursesViewControl.addEventListener("iteminvoked", this.navigateToHistory);

            //podczas powrotu do strony głównej robimy update 
            //tylko UI bez pobierania od nowa danych
            if (!datesLoaded) {
                this.loadDates().then(function () {
                    updateCurrenciesCourses(0);
                    datesLoaded = true;
                });
            } else {
                updateTitle(courseIndex);
            }

            var currentview = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
            currentview.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.collapsed;
        },

        //klikniecie na walute
        navigateToHistory: function (eventInfo) {
            WinJS.Navigation.navigate("/pages/history/history.html",
                {
                    code: curses.getItem(eventInfo.detail.itemIndex).data.code
                });
        },

        //klikniecie na date
        updateCurrenciesCoursesEvent: function (eventInfo) {
            courseIndex = eventInfo.detail.itemIndex;
            updateCurrenciesCourses(courseIndex);
        },

        //wczytuje daty oraz ich kody
        loadDates: function () {
            //ajax 
            return WinJS.xhr({ url: "http://www.nbp.pl/kursy/xml/dir.txt", responseType: "text" }).then(
                function complete(result) {
                    var arrayResponse = result.responseText.split('\r\n');
                    for (var i = 0; i < arrayResponse.length; i++) {
                        //wiersze zaczynające się od "a"
                        if (arrayResponse[i].charAt(0) == 'a') {
                            codes.push(arrayResponse[i]);

                            //konwersja do liczb, miesiące zero-based
                            var date = new Date(+arrayResponse[i].substr(5, 2) + +2000, +arrayResponse[i].substr(7, 2) - +1, arrayResponse[i].substr(9, 2));
                            datesBindingList.push({ date: date.toLocaleDateString("pl-PL") });
                        }
                    }

                    var p = new Promise(function (resolve, reject) {
                        resolve();
                    });
                    return p;
                });
        },

    });

    var codes = [];
    var datesBindingList = new WinJS.Binding.List();
    var curses = new WinJS.Binding.List();
    var coursesViewControl;
    var datesLoaded = false;
    var courseIndex = 0;

    function updateCurrenciesCourses(index) {
        loadCourses(codes[index]);
        updateTitle(index);
    }

    //ładuje kursy walut na wybrany dzień określony kodem
    function loadCourses(code) {
        var filename = code + ".xml";

        getXmlFileAsync(filename).then(function (xml) {
            parseXML(xml);
        });
    }

    function clearCurses() {
        coursesViewControl.itemDataSource = null;
        curses = new WinJS.Binding.List();
        coursesViewControl.itemDataSource = curses.dataSource;
    }

    function updateTitle(index) {
        var title = document.getElementById("title");
        title.innerHTML = "Kursy " + datesBindingList.getItem(index).data.date;
    }

    function parseXML(xml) {
        var items = xml.querySelectorAll('tabela_kursow > pozycja');
        clearCurses();

        for (var i = 0; i < items.length; i++) {
            curses.push(
                {
                    name: items[i].querySelector("nazwa_waluty").textContent,
                    convRate: items[i].querySelector("przelicznik").textContent,
                    code: items[i].querySelector("kod_waluty").textContent,
                    avg: items[i].querySelector("kurs_sredni").textContent
                });
        }
    }
})();