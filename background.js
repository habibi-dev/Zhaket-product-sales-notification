chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("zhaket-checker", {
        delayInMinutes: 1,
        periodInMinutes: 1
    });
});

// request only
const ORequest = async (url) => {

    let request = await fetch(`http://zhaket-product-sales-notification.habibi-dev.com/?ZUrl=${url}`);

    request = await request.json();

    if (!request.hasOwnProperty('status') || request.status !== 200)
        return null;

    return request.item;

}

// update
const Update = async () => {
    chrome.storage.local.get('urls', async (value) => {

        if (!value.hasOwnProperty('urls'))
            return null;

        let urls = JSON.parse(value.urls);

        let rows = [];

        await Promise.all(urls.map(async (item, index) => {
            if (item && item.hasOwnProperty('url')) {

                let request = await ORequest(item.url);

                if (!request)
                    return null;

                rows.push({
                    url: item.url,
                    ...request
                })
            }
        }));

        rows.map((item, index) => {

            urls.map(old => {
                if (old.url === item.url) {
                    if (old.count !== item.count) {
                        chrome.notifications.create(`notify-${index}`, {
                            type: 'basic',
                            iconUrl: '../badge.svg',
                            title: 'فروش جدید!',
                            message: `:: ${item.name} ${"\n"}تعداد فروش : ${item.count - urls[index].count}`,
                        })
                        let yourSound = new Audio('../notification.mp3');
                        yourSound.play();
                    }
                }
            })

        })

        // Update
        if (rows.length === urls.length)
            chrome.storage.local.set({'urls': JSON.stringify(rows)});
    });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "zhaket-checker") {
        console.log(alarm);
        Update();
    }
});
