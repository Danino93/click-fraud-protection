// modules/dataCollection.js
// מודול איסוף נתונים מ-Google Ads

const { google } = require('googleapis');

/**
 * איסוף נתוני קליקים מ-Google Ads
 * @param {OAuth2Client} oauth2Client - קליינט OAuth2 למערכת Google
 * @param {Object} supabase - קליינט Supabase
 * @returns {Boolean} - האם האיסוף הצליח
 */
async function fetchGoogleAdsData(oauth2Client, supabase) {
  try {
    // יצירת גישה ל-Google Ads API
    const googleAds = google.ads({
      version: 'v13',
      auth: oauth2Client
    });
    
    // קבלת מזהה הלקוח של Google Ads
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    
    // קבלת נתוני קליקים מ-Google Ads
    // שימוש ב-GAQL (Google Ads Query Language) לקבלת הנתונים הרלוונטיים
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.conversions,
        segments.date,
        segments.device,
        segments.hour,
        segments.click_type
      FROM click_view
      WHERE segments.date DURING LAST_7_DAYS
    `;
    
    const response = await googleAds.customers.search({
      customerId,
      query
    });
    
    if (!response.data || !response.data.results) {
      console.log('No click data found in Google Ads');
      return false;
    }
    
    // עיבוד הנתונים והכנתם לשמירה
    const clickData = response.data.results.map(result => {
      return {
        campaign_id: result.campaign.id,
        campaign_name: result.campaign.name,
        ad_group_id: result.adGroup.id,
        ad_group_name: result.adGroup.name,
        clicks: result.metrics.clicks,
        impressions: result.metrics.impressions,
        cost: result.metrics.costMicros / 1000000, // המרה ממיקרו לשקלים
        conversions: result.metrics.conversions,
        date: result.segments.date,
        device: result.segments.device,
        hour: result.segments.hour,
        click_type: result.segments.clickType,
        created_at: new Date(),
        source: 'google_ads_api'
      };
    });
    
    // שמירת הנתונים במסד הנתונים
    const { error } = await supabase
      .from('google_ads_data')
      .insert(clickData);
    
    if (error) {
      console.error('Error saving Google Ads data to database:', error);
      return false;
    }
    
    console.log(`Successfully fetched and saved ${clickData.length} click records from Google Ads`);
    
    // איסוף נתוני IP מהקליקים האחרונים (אם יש)
    await fetchRecentClickIPs(oauth2Client, supabase);
    
    return true;
  } catch (error) {
    console.error('Error in fetchGoogleAdsData:', error);
    return false;
  }
}

/**
 * איסוף כתובות IP מהקליקים האחרונים
 * (שים לב: Google Ads מספק מידע מוגבל על כתובות IP מטעמי פרטיות)
 * @param {OAuth2Client} oauth2Client - קליינט OAuth2 למערכת Google
 * @param {Object} supabase - קליינט Supabase
 * @returns {Boolean} - האם האיסוף הצליח
 */
async function fetchRecentClickIPs(oauth2Client, supabase) {
  try {
    // שים לב: במציאות, Google Ads לא מספק גישה ישירה לכתובות IP של קליקים
    // ברוב המקרים נצטרך לשלב מידע זה מהאתר עצמו
    
    // אך כאן נדגים כיצד ניתן לעבוד עם נתוני גיאוגרפיה שכן ניתנים ע"י Google Ads
    
    const googleAds = google.ads({
      version: 'v13',
      auth: oauth2Client
    });
    
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    
    // שאילתה לקבלת נתוני גיאוגרפיה של קליקים
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.clicks,
        metrics.cost_micros,
        segments.date,
        geographic_view.country_criterion_id,
        geographic_view.location_type,
        geographic_view.resource_name
      FROM geographic_view
      WHERE segments.date DURING LAST_7_DAYS
      AND metrics.clicks > 0
    `;
    
    const response = await googleAds.customers.search({
      customerId,
      query
    });
    
    if (!response.data || !response.data.results) {
      console.log('No geographic data found in Google Ads');
      return false;
    }
    
    // עיבוד נתוני הגיאוגרפיה
    const geoData = response.data.results.map(result => {
      return {
        campaign_id: result.campaign.id,
        campaign_name: result.campaign.name,
        clicks: result.metrics.clicks,
        cost: result.metrics.costMicros / 1000000,
        date: result.segments.date,
        country_id: result.geographicView.countryCriterionId,
        location_type: result.geographicView.locationType,
        created_at: new Date(),
        source: 'google_ads_api'
      };
    });
    
    // שמירת נתוני הגיאוגרפיה במסד הנתונים
    const { error } = await supabase
      .from('google_ads_geo_data')
      .insert(geoData);
    
    if (error) {
      console.error('Error saving Google Ads geographic data to database:', error);
      return false;
    }
    
    console.log(`Successfully fetched and saved ${geoData.length} geographic records from Google Ads`);
    return true;
  } catch (error) {
    console.error('Error in fetchRecentClickIPs:', error);
    return false;
  }
}

module.exports = {
  fetchGoogleAdsData
};