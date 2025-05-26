// modules/blocking.js
// מודול חסימת IP ועדכון הרשימה ב-Google Ads
const { google } = require('googleapis'); 
/**
 * הוספת IP לרשימת החסומים
 * @param {String} ip - כתובת ה-IP לחסימה
 * @param {String} reason - סיבת החסימה
 * @param {String} campaignId - מזהה הקמפיין (אופציונלי)
 * @returns {Boolean} - האם החסימה הצליחה
 */
async function blockIP(ip, reason, campaignId = null) {
    try {
      // בדיקה אם ה-IP כבר חסום
      const { data: existingIP } = await global.supabase
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', ip)
        .single();
      
      if (existingIP) {
        console.log(`IP ${ip} is already blocked`);
        return true;
      }
      
      // הוספת ה-IP לרשימת החסומים
      const { error } = await global.supabase
        .from('blocked_ips')
        .insert([
          { 
            ip_address: ip, 
            reason, 
            campaign_id: campaignId,
            blocked_by: 'auto',
            created_at: new Date()
          }
        ]);
      
      if (error) {
        console.error('Error blocking IP:', error);
        return false;
      }
      
      console.log(`IP ${ip} blocked successfully`);
      return true;
    } catch (error) {
      console.error('Error in blockIP:', error);
      return false;
    }
  }
  
  /**
   * הסרת IP מרשימת החסומים
   * @param {String} ip - כתובת ה-IP להסרה
   * @returns {Boolean} - האם ההסרה הצליחה
   */
  async function unblockIP(ip) {
    try {
      // הסרת ה-IP
      const { error } = await global.supabase
     .from('blocked_ips')
     .delete()
     .eq('ip_address', ip);
   
   if (error) {
     console.error('Error unblocking IP:', error);
     return false;
   }
   
   console.log(`IP ${ip} unblocked successfully`);
   return true;
 } catch (error) {
   console.error('Error in unblockIP:', error);
   return false;
 }
}
/**
* עדכון רשימת ה-IP החסומים ב-Google Ads
* @param {OAuth2Client} oauth2Client - קליינט OAuth2 למערכת Google
* @returns {Boolean} - האם העדכון הצליח
*/
async function updateGoogleAdsBlockedList(oauth2Client) {
 try {
   // קבלת רשימת כל ה-IP החסומים
   const { data: blockedIPs, error } = await global.supabase
     .from('blocked_ips')
     .select('ip_address');
   
   if (error) {
     console.error('Error fetching blocked IPs:', error);
     return false;
   }
   
   // המרת הנתונים לפורמט הנדרש עבור Google Ads
   const ipList = blockedIPs.map(item => item.ip_address);
   
   // עדכון הרשימה ב-Google Ads
   const customerService = google.ads.customerService({
     version: 'v9',
     auth: oauth2Client
   });
   
   // קבלת מזהה הלקוח של Google Ads
   const customer_id = process.env.GOOGLE_ADS_CUSTOMER_ID;
   
   // בדיקה האם קיימת כבר רשימת IP חסומים
   let negative_ip_list_id = await getOrCreateNegativeIPList(customerService, customer_id);
   
   // עדכון רשימת ה-IP החסומים
   await updateNegativeIPList(customerService, customer_id, negative_ip_list_id, ipList);
   
   console.log(`Updated Google Ads blocked IP list with ${ipList.length} IPs`);
   
   return true;
 } catch (error) {
   console.error('Error in updateGoogleAdsBlockedList:', error);
   return false;
 }
}

/**
* קבלה או יצירה של רשימת IP שליליים בחשבון Google Ads
* @param {Object} customerService - שירות לקוחות של Google Ads
* @param {String} customerId - מזהה הלקוח בחשבון Google Ads
* @returns {String} - מזהה רשימת ה-IP השליליים
*/
async function getOrCreateNegativeIPList(customerService, customerId) {
 try {
   // נסיון לקבל רשימות IP קיימות
   const response = await customerService.customers.campaignNegativeLists.list({
     parent: `customers/${customerId}`
   });
   
   // בדיקה אם יש רשימות קיימות
   if (response.data && response.data.results && response.data.results.length > 0) {
     // מציאת רשימת ה-IP שלנו (נניח שהשם הוא 'Fraud Protection IP List')
     const ourList = response.data.results.find(list => 
       list.name === 'Fraud Protection IP List'
     );
     
     if (ourList) {
       return ourList.id;
     }
   }
   
   // אם אין רשימה קיימת, יצירת רשימה חדשה
   const createResponse = await customerService.customers.campaignNegativeLists.create({
     parent: `customers/${customerId}`,
     resource: {
       name: 'Fraud Protection IP List',
       description: 'Automatically managed list of blocked IPs by fraud detection system'
     }
   });
   
   return createResponse.data.id;
 } catch (error) {
   console.error('Error in getOrCreateNegativeIPList:', error);
   throw error;
 }
}

/**
* עדכון רשימת ה-IP השליליים בחשבון Google Ads
* @param {Object} customerService - שירות לקוחות של Google Ads
* @param {String} customerId - מזהה הלקוח בחשבון Google Ads
* @param {String} listId - מזהה הרשימה לעדכון
* @param {Array} ipList - רשימת כתובות ה-IP לחסימה
*/
async function updateNegativeIPList(customerService, customerId, listId, ipList) {
 try {
   // קבלת הרשימה הנוכחית
   const getCurrentResponse = await customerService.customers.campaignNegativeLists.get({
     name: `customers/${customerId}/campaignNegativeLists/${listId}`
   });
   
   // עדכון הרשימה עם כתובות ה-IP החדשות
   await customerService.customers.campaignNegativeLists.update({
     name: `customers/${customerId}/campaignNegativeLists/${listId}`,
     resource: {
       id: listId,
       negativeIps: ipList
     }
   });
   
   console.log(`Updated negative IP list ${listId} with ${ipList.length} IPs`);
 } catch (error) {
   console.error('Error in updateNegativeIPList:', error);
   throw error;
 }
}

/**
* בדיקה האם IP נמצא ברשימת החסומים
* @param {String} ip - כתובת ה-IP לבדיקה
* @returns {Boolean} - האם ה-IP חסום
*/
async function isIPBlocked(ip) {
 try {
   const { data, error } = await global.supabase
     .from('blocked_ips')
     .select('*')
     .eq('ip_address', ip)
     .single();
   
   if (error && error.code !== 'PGRST116') {
     console.error('Error checking if IP is blocked:', error);
     return false;
   }
   
   return !!data;
 } catch (error) {
   console.error('Error in isIPBlocked:', error);
   return false;
 }
}

module.exports = {
 blockIP,
 unblockIP,
 updateGoogleAdsBlockedList,
 isIPBlocked
};