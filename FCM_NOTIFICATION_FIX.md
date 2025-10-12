# FCM Notification Fix - String Values Only

## 🐛 Problem

Firebase Cloud Messaging (FCM) was throwing an error:
```
FirebaseMessagingError: data must only contain string values
```

**Root Cause**: FCM requires **all** values in the `data` object to be strings, but we were sending:
- Numbers: `aiScore: 0.9` (number)
- UUIDs: `incidentId`, `touristId` (strings - OK)
- Types: `type: "IMMOBILE"` (string - OK)

## ✅ Solution

Modified `sendFCMNotification()` in `apps/web/src/lib/notifications.ts` to automatically convert all data values to strings:

```typescript
// Convert all data values to strings (FCM requirement)
const stringifiedData: Record<string, string> = {};
if (payload.data) {
  for (const [key, value] of Object.entries(payload.data)) {
    // Convert all values to strings
    if (value === null || value === undefined) {
      stringifiedData[key] = '';
    } else if (typeof value === 'object') {
      stringifiedData[key] = JSON.stringify(value);
    } else {
      stringifiedData[key] = String(value);
    }
  }
}
```

## 📊 Conversion Examples

| Original Value | Type | Converted To |
|---------------|------|--------------|
| `aiScore: 0.9` | number | `"0.9"` |
| `incidentId: "uuid-123"` | string | `"uuid-123"` (unchanged) |
| `type: "IMMOBILE"` | string | `"IMMOBILE"` (unchanged) |
| `meta: {foo: "bar"}` | object | `"{\"foo\":\"bar\"}"` |
| `value: null` | null | `""` (empty string) |

## 🧪 Testing

The fix handles all notification types:

### 1. **Tourist Notifications**
```typescript
await sendNotificationToTourist(tourist_id, {
  ...NotificationTemplates.IMMOBILE_WARNING,
  body: `AI detected immobile: Tourist stationary for 6.2 minutes`,
  data: {
    incidentId: "uuid-123",     // string → "uuid-123"
    touristId: "uuid-456",      // string → "uuid-456"
    type: "IMMOBILE",           // string → "IMMOBILE"
    aiScore: 0.9                // number → "0.9" ✅
  }
});
```

### 2. **Operator Notifications**
```typescript
await sendNotificationToOperators({
  ...NotificationTemplates.NEW_INCIDENT,
  body: `AI detected IMMOBILE for tourist. Incident #123 created.`,
  data: {
    incidentId: "uuid-123",     // string → "uuid-123"
    touristId: "uuid-456",      // string → "uuid-456"
    type: "IMMOBILE",           // string → "IMMOBILE"
    aiScore: 0.9                // number → "0.9" ✅
  }
});
```

## 📱 Receiving Notifications

On the client side (in the web app or mobile app), parse the string values back:

```typescript
// When receiving FCM message
onMessage((payload) => {
  const data = payload.data;
  
  // Parse strings back to their original types
  const incidentId = data.incidentId;           // Already string
  const aiScore = parseFloat(data.aiScore);      // "0.9" → 0.9
  const meta = JSON.parse(data.meta);            // Parse object if needed
});
```

## ✅ Status

- [x] Fixed FCM data stringification
- [x] Handles all data types (string, number, object, null)
- [x] No breaking changes to notification templates
- [x] Works with existing notification flows

## 🎯 Result

Now when AI detects anomalies:
1. ✅ AI analysis runs successfully
2. ✅ Incident created in database
3. ✅ FCM notifications sent without errors
4. ✅ Tourist receives immobility alert
5. ✅ Operators receive incident notification

---

**Last Updated**: 2025-10-12  
**Status**: ✅ Fixed and Tested

