function jsx(html, ...args) {
    return html.slice(1).reduce((str, elem, i) => str + args[i] + elem, html[0]);
}

const GRAPHQL_QUERY = '/graphql/execute.json/ref-demo-eds/CTAByPath';

async function start(CFPath, DM_TEMPLATE_CROP_SIZE_MAPPING) {
    const url = window.parent.parent.parent.location.href;
    const parsed = new URL(url);
    const aemauthorurl = parsed.searchParams.get('repo');
    const variationname = new URLSearchParams(parsed.hash.split('?')[1]).get('variation');

    const sessionToken = JSON.parse(sessionStorage.getItem('adobeid_ims_access_token/exc_app/false/AdobeID,ab.manage,account_cluster.read,accounts.read,additional_info,additional_info.job_function,additional_info.projectedProductContext,additional_info.roles,adobeio.appregistry.read,adobeio_api,aem.frontend.all,audiencemanager_api,creative_cloud,mps,openid,org.read,pps.read,read_organizations,read_pc,read_pc.acp,read_pc.dma_tartan,service_principals.write,session'));

    const requestUrl = `https://${aemauthorurl}${GRAPHQL_QUERY};path=${CFPath};variation=${variationname};ts=${Date.now()}`;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken.tokenValue}` };

    try {
        const response = await fetch(requestUrl, { method: 'GET', headers });

        if (!response.ok) {
            console.error(`error making cf graphql request: ${response.status}`, { contentPath: CFPath, variationname });
            return;
        }

        let offer;
        try {
            offer = await response.json();
        } catch (parseError) {
            console.error('Error parsing offer JSON from response:', {
                error: parseError.message,
                stack: parseError.stack,
                contentPath: CFPath,
                variationname
            });
            return;
        }

        console.log(offer);

        const { item } = offer.data.ctaByPath;
        const title = item.title || 'No title';
        const description = item.description.plaintext || 'No description';
        const { bannerimage } = item;
        let blockHTML = '';

        if ('_dmS7Url' in bannerimage) {
            const dmS7UrlParsed = new URL(bannerimage._dmS7Url).pathname.replace('/is/image/', '/');

            if (bannerimage._smartCrops?.length) {
                bannerimage._smartCrops.forEach(crop => {
                    const cropUrl = `${DM_TEMPLATE_CROP_SIZE_MAPPING[crop.name]}?$image=is(${dmS7UrlParsed}:${crop.name})&$title=${title}&$description=${description}&ts=${Date.now()}`;
                    blockHTML += jsx`
                        <div>
                            <h3>${crop.name}</h3>
                            <img src="${cropUrl}" alt="${crop.name}">
                            <div class="input-group mt-3">
                                <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText(this.nextElementSibling.value)">Copy URL</button>
                                <input class="form-control" type="text" value="${cropUrl}" disabled readonly>
                            </div>
                            <hr>
                        </div>
                    `;
                });
            } else if ('_smartCrops' in bannerimage) {
                blockHTML += jsx`<div class="alert alert-warning" role="alert">No smart crops available for this image<div>`;
            } else {
                blockHTML += jsx`<div class="alert alert-danger" role="alert">Image missing smart crops<div>`;
            }
        } else {
            blockHTML += jsx`<div class="alert alert-danger" role="alert">Image is not published to Dynamic Media<div>`;
        }

        const col = document.createElement('div');
        col.className = 'col p-5';
        col.innerHTML = blockHTML;

        const row = document.createElement('div');
        row.className = 'row p-3';
        row.appendChild(col);

        document.body.appendChild(row);

    } catch (error) {
        console.error('Error rendering content fragment:', {
            error: error.message,
            stack: error.stack,
            contentPath: CFPath,
            variationname
        });
    }
}