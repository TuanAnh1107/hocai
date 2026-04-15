function getAppBaseUrl() {
    const explicitBaseUrl = (process.env.BASE_URL || '').trim();
    if (explicitBaseUrl) {
        return explicitBaseUrl.replace(/\/+$/, '');
    }

    const renderHostname = (process.env.RENDER_EXTERNAL_HOSTNAME || '').trim();
    if (renderHostname) {
        return `https://${renderHostname}`;
    }

    const port = parseInt(process.env.PORT, 10) || 3000;
    return `http://localhost:${port}`;
}

module.exports = {
    getAppBaseUrl
};
