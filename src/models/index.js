const sequelize = require('../config/database');

const User = require('./User');
const Business = require('./Business');
const Plan = require('./Plan');
const Subscription = require('./Subscription');
const Product = require('./Product');
const ContentRequest = require('./ContentRequest');
const Corporate = require('./Corporate');
const Employee = require('./Employee');
const Promotion = require('./Promotion');
const Redemption = require('./Redemption');
const AnalyticsEvent = require('./AnalyticsEvent');

// --- Asociaciones ---

User.hasOne(Business, { foreignKey: 'userId' });
Business.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Employee, { foreignKey: 'userId' });
Employee.belongsTo(User, { foreignKey: 'userId' });

Corporate.hasMany(Employee, { foreignKey: 'corporateId' });
Employee.belongsTo(Corporate, { foreignKey: 'corporateId' });

Business.hasMany(Subscription, { foreignKey: 'businessId' });
Subscription.belongsTo(Business, { foreignKey: 'businessId' });
Plan.hasMany(Subscription, { foreignKey: 'planId' });
Subscription.belongsTo(Plan, { foreignKey: 'planId' });

Business.hasMany(Product, { foreignKey: 'businessId' });
Product.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(ContentRequest, { foreignKey: 'businessId' });
ContentRequest.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Promotion, { foreignKey: 'businessId' });
Promotion.belongsTo(Business, { foreignKey: 'businessId' });
Corporate.hasMany(Promotion, { foreignKey: 'corporateId' });
Promotion.belongsTo(Corporate, { foreignKey: 'corporateId' });

Promotion.hasMany(Redemption, { foreignKey: 'promotionId' });
Redemption.belongsTo(Promotion, { foreignKey: 'promotionId' });
Employee.hasMany(Redemption, { foreignKey: 'employeeId' });
Redemption.belongsTo(Employee, { foreignKey: 'employeeId' });
Business.hasMany(Redemption, { foreignKey: 'businessId' });
Redemption.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(AnalyticsEvent, { foreignKey: 'businessId' });
AnalyticsEvent.belongsTo(Business, { foreignKey: 'businessId' });

module.exports = {
  sequelize,
  User,
  Business,
  Plan,
  Subscription,
  Product,
  ContentRequest,
  Corporate,
  Employee,
  Promotion,
  Redemption,
  AnalyticsEvent,
};
