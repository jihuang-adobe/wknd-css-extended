function jsx(html, ...args) {
    return html.slice(1).reduce((str, elem, i) => str + args[i] + elem, html[0]);
}

async function start(CFPath, DM_TEMPLATE_CROP_SIZE_MAPPING) {
    var blockHTML = '';
    const url = window.parent.parent.parent.location.href;
    const parsed = new URL(url);
    const aemauthorurl = parsed.searchParams.get('repo');
    const hash = parsed.hash; 
    const variationname = new URLSearchParams(hash.split('?')[1]).get('variation');
    const contentPath = CFPath;

    const sessionToken = JSON.parse(sessionStorage.getItem('adobeid_ims_access_token/exc_app/false/AdobeID,ab.manage,account_cluster.read,accounts.read,additional_info,additional_info.job_function,additional_info.projectedProductContext,additional_info.roles,adobeio.appregistry.read,adobeio_api,aem.frontend.all,audiencemanager_api,creative_cloud,mps,openid,org.read,pps.read,read_organizations,read_pc,read_pc.acp,read_pc.dma_tartan,service_principals.write,session'));

    const CONFIG = {
        GRAPHQL_QUERY: '/graphql/execute.json/ref-demo-eds/CTAByPath'
    };
    
    const requestConfig = {
        url: `https://${aemauthorurl}${CONFIG.GRAPHQL_QUERY};path=${contentPath};variation=${variationname};ts=${Date.now()}`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken.tokenValue}` }
    };

    try {
    // Fetch data
    const response = await fetch(requestConfig.url, {
        method: requestConfig.method,
        headers: requestConfig.headers,
        ...(requestConfig.body && { body: requestConfig.body })
    });

    if (!response.ok) {
        console.error(`error making cf graphql request:${response.status}`, {
            error: error.message,
            stack: error.stack,
            contentPath,
            variationname
        });

        return; // Exit early if response is not ok
    } 

    let offer;

    try {
        offer = await response.json();
    } catch (parseError) {
        console.error('Error parsing offer JSON from response:', {
            error: parseError.message,
            stack: parseError.stack,
            contentPath,
            variationname
        });

        return;
    }

    console.log(offer);

    const row = document.createElement('div');
    row.className = 'row p-3';

    const col = document.createElement('div');
    col.className = 'col';

    row.appendChild(col);

    const title = offer.data.ctaByPath.item.title || 'No title';
    const description = offer.data.ctaByPath.item.description.plaintext || 'No description';
    var dmS7UrlParsed;
    var blockHTML = '';

    if (offer.data.ctaByPath.item.bannerimage.hasOwnProperty('_dmS7Url')) {
        const dmS7Url = new URL(offer.data.ctaByPath.item.bannerimage._dmS7Url);
        dmS7UrlParsed = dmS7Url.pathname.replace('/is/image/', '/');
    } else {
        blockHTML += jsx`
            <div class="alert alert-danger" role="alert">Image is not published to Dynamic Media<div>
        `;
    }

    if (offer.data.ctaByPath.item.bannerimage.hasOwnProperty('_smartCrops')) {
        if (offer.data.ctaByPath.item.bannerimage._smartCrops) {
            offer.data.ctaByPath.item.bannerimage._smartCrops.forEach(crop => {
                blockHTML += jsx`
                    <div>
                        <h3>${crop.name}</h3>
                        <img src="${DM_TEMPLATE_CROP_SIZE_MAPPING[crop.name]}?$image=is(${dmS7UrlParsed}:${crop.name})&$title=${title}&$description=${description}&ts=${Date.now()}" alt="${crop.name}">
                        <div class="input-group mt-3">
                            <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText(this.nextElementSibling.value)">Copy URL</button>
                            <input class="form-control" type="text" value="${DM_TEMPLATE_CROP_SIZE_MAPPING[crop.name]}?$image=is(${dmS7UrlParsed}:${crop.name})&$title=${title}&$description=${description}&ts=${Date.now()}" disabled readonly>
                        </div>
                        <hr>
                    </div>
                `;
            });
        } else {
            blockHTML += jsx`
                <div class="alert alert-warning" role="alert">No smart crops available for this image<div>
            `;
        }
    } else {
        blockHTML += jsx`
            <div class="alert alert-danger" role="alert">Image missing smart crops<div>
        `;
    }

    col.innerHTML = blockHTML;

    document.body.appendChild(row);

    } catch (error) {
        console.error('Error rendering content fragment:', {
            error: error.message,
            stack: error.stack,
            contentPath,
            variationname
        });
    }
}