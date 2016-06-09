(function () {
    "use strict";
    var CURR_CODE;
    var rollBtn;
    var showBtn;
    var startDatePicker;
    var endDatePicker;
    var startDate;
    var endDate;
    var progress;

    var divChart;
    var dataChart = [];
    var labelsChart = [];

    WinJS.UI.Pages.define("/pages/history/history.html", {
        ready: function (element, options) {

            var currentview = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
            currentview.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
            currentview.onbackrequested = onBackRequested;

            CURR_CODE = options.code.toString();
            updateTitle();

            startDatePicker = $("#startDate");
            endDatePicker = $("#endDate");
            startDatePicker.change(changeDateEvent);
            endDatePicker.change(changeDateEvent);
            setDefaultValuesDatepickers();


            rollBtn = document.getElementById("rollBtn");
            rollBtn.addEventListener("click", rollMenu, false);

            showBtn = document.getElementById("showBtn");
            showBtn.addEventListener("click", this.showChart, false);

            progress = document.getElementById("testProgress");
            divChart = document.getElementById("chart");
            document.getElementById("saveCmd").addEventListener("click", saveChart);

            this.showChart();
        },

        showChart: function () {
            progress.value = 0;
            var promises = [];
            var currentYear = new Date().getFullYear();
            for (var i = startDate.getFullYear() ; i <= endDate.getFullYear() ; i++) {
                var dirName;
                if (i != +currentYear) {
                    dirName = 'dir' + i;
                } else {
                    dirName = 'dir'
                }
                promises.push(WinJS.xhr({ url: "http://www.nbp.pl/kursy/xml/" + dirName + ".txt", responseType: "text" }));
            }

            WinJS.Promise.join(promises).then(function (txtRequests) {

                //pobranie plików txt dla odpowiednich dat i wyciągnięcie z nich rekordów
                //zaczynających się na 'a' oraz przyporządkowane im daty
                var dateCodes = []; //{data, kod}
                txtRequests.forEach(function (result) {
                    var arrayResponse = result.responseText.split('\r\n');
                    for (var i = 0; i < arrayResponse.length; i++) {
                        //wiersze zaczynające się od "a"
                        if (arrayResponse[i].charAt(0) == 'a') {
                            //konwersja do liczb, miesiące zero-based
                            var date = new Date(+arrayResponse[i].substr(5, 2) + +2000, +arrayResponse[i].substr(7, 2) - +1, arrayResponse[i].substr(9, 2));
                            if (date < startDate || date > endDate)
                                continue;
                            dateCodes.push(
                                {
                                    date: date,
                                    code: arrayResponse[i]
                                });
                        }
                    }
                });
                return dateCodes;

                //pobieram kursy na odpowiednie dni dla konkretnej waluty
            }).then(function (dateCodes) {
                dataChart = [];
                labelsChart = [];
                promises = [];
                var index = 0;
                if (dateCodes) {
                    dateCodes.forEach(function (element) {
                        var progressStep = 100 / dateCodes.length;
                        getXmlFileAsync(element.code + '.xml').done(function (xml) {
                            getDataChart({ xml: xml, date: element.date });
                            progress.value += progressStep;
                            index++;
                            if (index == dateCodes.length) {
                                drawChart();
                            }
                            console.log(progress.value);
                        });
                    })
                }
            });
        }
    });

    function onBackRequested(eventArgs) {
        WinJS.Navigation.back();
    }

    function updateTitle() {
        var title = document.getElementById("historyPageTitle");
        title.innerHTML = "Historia waluty " + CURR_CODE;
    }

    function rollMenu() {
        var rollableDiv = $("#rollableDiv");
        if (rollableDiv.is(":visible") == true) {
            rollableDiv.hide();
            rollBtn.innerHTML = "";
        }
        else {
            rollableDiv.show();
            rollBtn.innerHTML = "";
        }
    }

    function changeDateEvent(eventInfo) {
        progress.value = 0;
        startDate = new Date(startDatePicker.val());
        endDate = new Date(endDatePicker.val());
        var btn = $('#showBtn');
        if (startDate > endDate) {
            btn.attr("disabled", true);
        } else {
            btn.attr("disabled", false);
        }
    }

    function saveChart(eventInfo) {
        var folderPicker = new Windows.Storage.Pickers.FolderPicker();
        folderPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
        folderPicker.fileTypeFilter.replaceAll(["*"]);

        folderPicker.pickSingleFolderAsync().done(function success(storageFolder) {
            html2canvas(divChart, {
                onrendered: function (canvas) {
                    var output;
                    var input;
                    var outputStream;
                    var blob = canvas.msToBlob();

                    storageFolder.createFileAsync(CURR_CODE + '.png', Windows.Storage.CreationCollisionOption.replaceExisting).then(function (file) {
                        return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
                    }).then(function (stream) {
                        outputStream = stream;
                        output = stream.getOutputStreamAt(0);
                        input = blob.msDetachStream();
                        return Windows.Storage.Streams.RandomAccessStream.copyAsync(input, output);
                    }).then(function () {
                        return output.flushAsync();
                    }).done(function () {
                        input.close();
                        output.close();
                        outputStream.close();
                    });
                }
            });
            //console.log('Folder: ' + storageFolder.displayName);
        });
    }

    function drawChart() {

        var lowest = Number.POSITIVE_INFINITY;
        var highest = Number.NEGATIVE_INFINITY;
        var tmp;
        for (var i = dataChart.length - 1; i >= 0; i--) {
            tmp = dataChart[i].y;
            if (tmp < lowest) lowest = tmp;
            if (tmp > highest) highest = tmp;
        }
        console.log(highest, lowest);

        dataChart = dataChart.sort(compare);
        var chart = new CanvasJS.Chart("chartContainer",
                {
                    title: {
                        text: CURR_CODE,
                        fontSize: 30
                    },
                    axisY: {
                        minimum: lowest - 0.1,
                        maximum: highest + 0.1
                    },
                    data: [
                    {
                        type: "line",
                        dataPoints: dataChart
                    }]
                });

        chart.render();
        console.log("drawing");
    }

    function setDefaultValuesDatepickers() {
        var actualDate = new Date();
        var endDateStr = formatDateToString(actualDate);
        actualDate.setDate(actualDate.getDate() - 7);
        var startDataStr = formatDateToString(actualDate);

        $(".date-picker").attr({
            "max": endDateStr,
            "min": '2002-01-02',
        });
        endDatePicker.val(endDateStr);
        startDatePicker.val(startDataStr);
        startDate = new Date(startDatePicker.val());
        endDate = new Date(endDatePicker.val());
    }

    function formatDateToString(date) {
        var month = (+date.getMonth() + 1).toString();
        var day = date.getDate().toString();

        if (day.length == 1) {
            day = '0' + day;
        }
        if (month.length == 1) {
            month = '0' + month;
        }

        return date.getFullYear() + '-' + month + '-' + day;
    }

    function getDataChart(arg) {
        var items = arg.xml.querySelectorAll('tabela_kursow > pozycja');

        for (var i = 0; i < items.length; i++) {
            var code = items[i].querySelector("kod_waluty").textContent;
            var avg = items[i].querySelector("kurs_sredni").textContent;
            var formatedDate = arg.date.toLocaleDateString("pl-PL");
            if (code == CURR_CODE) {
                dataChart.push({ x: arg.date, y: parseLocalNum(avg) });
            }
        }
    }

    function parseLocalNum(num) {
        return +(num.replace(",", "."));
    }

    function compare(a, b) {
        if (a.x < b.x)
            return -1;
        else if (a.x > b.x)
            return 1;
        else
            return 0;
    }
})();