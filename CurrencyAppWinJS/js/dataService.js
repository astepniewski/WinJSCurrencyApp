var applicationData = Windows.Storage.ApplicationData.current;
var localFolder = applicationData.localFolder;
var localSettings = applicationData.localSettings;

function getXmlFileAsync(filename) {
    return WinJS.Application.local.exists(filename).then(function (found) {
        if (found) {
            return localFolder.getFileAsync(filename).then(function (file) {
                return Windows.Storage.FileIO.readTextAsync(file);
            }).then(function (xmlText) {
                var xml = jQuery.parseXML(xmlText);

                //jeśli plik nie jest pusty wczytuje
                if (xml) {
                    var p = new Promise(function (resolve, reject) {
                        resolve(xml);
                    });
                    return p;
                }
                    //jeśli plik jest pusty pobieram jeszcze raz
                else {
                    return downloadAndSaveXmlAsync(filename);
                }
            });
        } else {
            return downloadAndSaveXmlAsync(filename);
        }
    });
}

function writeFile(filename, content) {
    localFolder.createFileAsync(filename, Windows.Storage.CreationCollisionOption.replaceExisting)
       .then(function (file) {
           return Windows.Storage.FileIO.writeTextAsync(file, content);
       }).done(function () {
       });
}

function downloadAndSaveXmlAsync(filename) {
    return WinJS.xhr({ url: 'http://www.nbp.pl/kursy/xml/' + filename, responseType: "document" }).then(function (result) {
        var xml = result.responseXML;
        writeFile(filename, new XMLSerializer().serializeToString(xml));

        var p = new Promise(function (resolve, reject) {
            resolve(xml);
        });
        return p;
    });
}