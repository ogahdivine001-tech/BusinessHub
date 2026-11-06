const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,
    meta: mongoose.Schema.Types.Mixed, // e.g. { from, to } so a change can be reviewed later
    reason: { type: String, maxlength: 500 },
    ip: String,
  },
  { timestamps: true }
);

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ targetType: 1, targetId: 1 });

// Audit entries are append-only. Nothing in the application may edit or
// delete one; these hooks make that a hard rule rather than a convention.
// (Application code is not the only way to reach a database, so also give
// the app's database user no update/delete rights on this collection where
// your host allows it.)
const refuse = () => { throw new Error('Audit log entries cannot be modified or deleted.'); };
adminLogSchema.pre(
  ['updateOne', 'updateMany', 'replaceOne', 'findOneAndUpdate', 'findOneAndReplace',
    'findOneAndDelete', 'deleteOne', 'deleteMany'],
  refuse
);
adminLogSchema.pre('deleteOne', { document: true, query: false }, refuse);
adminLogSchema.pre('save', function blockResave(next) {
  if (!this.isNew) return next(new Error('Audit log entries cannot be modified or deleted.'));
  return next();
});

module.exports = mongoose.model('AdminLog', adminLogSchema);
