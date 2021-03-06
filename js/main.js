window.addEventListener("load", function () {

    // request
    const Request = async (url) => {

        // set loading
        document.querySelector('button.create-url').textContent = 'در حال بررسی...';
        document.querySelector('button.create-url').setAttribute('disabled', true);

        let request = await fetch(`http://zhaket-product-sales-notification.habibi-dev.com/?ZUrl=${url}`);

        // remove loading
        document.querySelector('button.create-url').textContent = 'ایجاد';
        document.querySelector('button.create-url').removeAttribute('disabled');

        request = await request.json();

        if (!request.hasOwnProperty('status')) {
            alert('عملیات با خطا روبرو شد.')
            return null;
        }

        if (request.status !== 200) {
            alert(request.msg);
            return null;
        }

        return request.item;

    }

    // request only
    const ORequest = async (url) => {

        let request = await fetch(`http://zhaket-product-sales-notification.habibi-dev.com/?ZUrl=${url}`);

        request = await request.json();

        if (!request.hasOwnProperty('status') || request.status !== 200)
            return null;

        return request.item;

    }

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
                        ...request,
                        url: item.url
                    })
                }
            }));

            rows.map((item, index) => {

                urls.map(old => {
                    if (old.url === item.url) {
                        if (old.count !== item.count) {
                            chrome.notifications.create(`notify-${index}`, {
                                type: 'basic',
                                iconUrl: item.image,
                                title: 'فروش جدید!',
                                contextMessage: `${item.name}`,
                                priority: 2,
                                message: ` فروش جدید: ${item.count - old.count}${"\n"}فروش کل: ${parseInt(item.count).toLocaleString("en-US")}`,
                            })
                            new Audio('../notification.mp3').play();
                        }
                    }
                })

            })

            // Update
            if (rows.length === urls.length) {
                chrome.storage.local.set({'urls': JSON.stringify(rows)});
                Compiler();
            }
        });
    }

    setInterval(Update, 10000);

    // add db
    document.querySelector('button.btn.btn-sm.btn-primary.create-url').addEventListener('click', () => {

        // get url
        const url = document.querySelector('input#url');

        chrome.storage.local.get('urls', async (value) => {

            let urls

            if (!value.hasOwnProperty('urls'))
                urls = [];
            else
                urls = JSON.parse(value.urls);

            // request
            Request(url.value).then(item => {

                if (!item)
                    return null;

                urls.push({
                    ...item,
                    'url': url.value,
                });

                // Update
                chrome.storage.local.set({'urls': JSON.stringify(urls)});

                // Close box
                document.querySelector('button.close').click();

                // Reset input
                url.value = '';

                Compiler();
            })
        })

    })

    // Change alerts time
    document.querySelector('select').addEventListener('change', (e) => {

        // Remove old alert
        chrome.alarms.clear('zhaket-checker');

        // add new time
        chrome.alarms.create("zhaket-checker", {
            delayInMinutes: parseInt(e.target.value),
            periodInMinutes: parseInt(e.target.value)
        });
    })

    // compile table
    const Compiler = () => {
        chrome.storage.local.get('urls', async (value) => {

            if (!value.hasOwnProperty('urls'))
                return null;

            let urls = JSON.parse(value.urls);

            let rows = [];

            urls.sort(function (a, b) {
                return a.count - b.count;
            }).reverse();

            urls.map((item, index) => {
                if (item && item.hasOwnProperty('url'))
                    rows.push(`<tr><td><img src="${item.image}" alt="${item.name}" width="24"></td><td class="text-start"><h2>:: <a href="${item.url}" target="_blank">${item.name}</a></h2></td>
            <td><span>${parseInt(item.count).toLocaleString("en-US")}</span></td><td>
            <span type="button" class="badge small bg-danger remove" data-id="${index}">${'حذف'}</span></td></tr>`)
            });

            if (rows.length)
                document.querySelector('tbody').innerHTML = rows.join('')
            else
                document.querySelector('tbody').innerHTML = `<tr><td class="text-start" colspan="3">محصولی یافت نشد</td></tr>`;

            // remove
            document.querySelectorAll('span.remove').forEach(item => {
                item.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');

                    urls = urls.filter(function (value, index, arr) {
                        return index !== parseInt(id);
                    });

                    // Update
                    chrome.storage.local.set({'urls': JSON.stringify(urls)});

                    Compiler();
                })
            })
        })
    }
    Compiler();

    // select time
    chrome.alarms.get("zhaket-checker").then(r => {
        document.querySelector('select').value = r.periodInMinutes;
    })

});
