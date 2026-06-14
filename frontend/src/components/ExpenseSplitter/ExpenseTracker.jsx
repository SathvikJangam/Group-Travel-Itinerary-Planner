// client/src/components/ExpenseSplitter/ExpenseTracker.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from "../../context/AuthContext";

export default function ExpenseTracker({ tripId, tripMembers, onMemberAdded }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTab, setInviteTab] = useState('Email');
  const [inviteData, setInviteData] = useState({ email: '', name: '' });
  const [inviteLoading, setInviteLoading] = useState(false);

  const [showManageModal, setShowManageModal] = useState(false);
  const [renameMemberId, setRenameMemberId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [manageLoading, setManageLoading] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    category: 'Food',
    totalAmount: '',
    paidById: user?._id || '', 
    splitType: 'EQUAL',
    selectedUserIds: [], 
    exactParticipants: {} 
  });

  const [expandedBalanceId, setExpandedBalanceId] = useState(null);
  const [editExpenseId, setEditExpenseId] = useState(null);

  const safeTripMembers = Array.isArray(tripMembers) ? tripMembers : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const isCreator = safeTripMembers.find(m => m.userId?._id === user?._id)?.role === 'Creator';

  const getMemberInfo = (member) => {
    if (!member) return { id: null, name: 'Unknown' };
    return {
      id: member.isGuest ? member.guestId : member.userId?._id,
      name: member.isGuest ? member.name : member.userId?.name
    };
  };

  const fetchExpenses = async () => {
    try {
      const { data } = await axios.get(`/expenses/${tripId}`);
      setExpenses(data);
    } catch (error) {
      console.error("Failed to fetch expenses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [tripId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      if (inviteTab === 'Email') {
        await axios.post(`/trips/${tripId}/invite-member`, { email: inviteData.email });
      } else {
        await axios.post(`/trips/${tripId}/invite-guest`, { name: inviteData.name });
      }
      setShowInviteModal(false);
      setInviteData({ email: '', name: '' });
      if (onMemberAdded) onMemberAdded();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to add participant.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this participant?")) return;
    setManageLoading(true);
    try {
      await axios.delete(`/trips/${tripId}/members/${memberId}`);
      if (onMemberAdded) onMemberAdded();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to remove participant.");
    } finally {
      setManageLoading(false);
    }
  };

  const handleRenameGuest = async (memberId) => {
    if (!renameValue.trim()) return;
    setManageLoading(true);
    try {
      await axios.put(`/trips/${tripId}/members/${memberId}/rename`, { name: renameValue });
      setRenameMemberId(null);
      setRenameValue('');
      if (onMemberAdded) onMemberAdded();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to rename guest.");
    } finally {
      setManageLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const totalAmt = Number(formData.totalAmount);
      const payload = {
        ...formData,
        tripId,
        totalAmount: totalAmt,
        selectedUserIds: formData.splitType === 'CUSTOM' && formData.selectedUserIds.length > 0 
          ? formData.selectedUserIds 
          : [user?._id]
      };

      if (formData.splitType === 'EXACT') {
        let sum = 0;
        const formattedExact = [];
        for (const [id, amount] of Object.entries(formData.exactParticipants)) {
          const amtNum = Number(amount || 0);
          if (amtNum > 0) {
            sum += amtNum;
            formattedExact.push({ id, amountOwed: amtNum });
          }
        }
        if (Math.abs(sum - totalAmt) > 0.1) {
          return alert(`Exact amounts must sum up to ₹${totalAmt}. Currently: ₹${sum}`);
        }
        payload.exactParticipants = formattedExact;
      }

      if (editExpenseId) {
        await axios.put(`/expenses/${editExpenseId}`, payload);
        setEditExpenseId(null);
      } else {
        await axios.post('/expenses', payload);
      }
      setShowAddModal(false);
      setFormData({ description: '', category: 'Food', totalAmount: '', paidById: user?._id || '', splitType: 'EQUAL', selectedUserIds: [], exactParticipants: {} });
      fetchExpenses();
    } catch (error) {
      console.error("Failed to add expense");
      alert(error.response?.data?.error || "Failed to add expense");
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await axios.delete(`/expenses/${expenseId}`);
      fetchExpenses();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to delete expense");
    }
  };

  const handleEditExpenseClick = (exp) => {
    setFormData({
      description: exp.description,
      category: exp.category,
      totalAmount: exp.totalAmount.toString(),
      splitType: exp.splitType,
      paidById: exp.paidByMultiple ? 'MULTIPLE' : (exp.paidByGuestId || exp.paidBy?._id),
      selectedUserIds: exp.splitType === 'CUSTOM' ? exp.participants.map(p => p.guestId || p.userId?._id) : [],
      exactParticipants: exp.splitType === 'EXACT' ? exp.participants.reduce((acc, p) => ({...acc, [p.guestId || p.userId?._id]: p.amountOwed}), {}) : {}
    });
    setEditExpenseId(exp._id);
    setShowAddModal(true);
  };

  const toggleUserSelection = (userId) => {
    setFormData(prev => ({
      ...prev,
      selectedUserIds: prev.selectedUserIds.includes(userId)
        ? prev.selectedUserIds.filter(id => id !== userId)
        : [...prev.selectedUserIds, userId]
    }));
  };

  const handleExactAmountChange = (id, amount) => {
    setFormData(prev => ({
      ...prev,
      exactParticipants: { ...prev.exactParticipants, [id]: amount }
    }));
  };

  const calculateBalances = () => {
    const balances = {}; 
    safeTripMembers.forEach(member => {
      const { id, name } = getMemberInfo(member);
      if (id) balances[id] = { id, name, netAmount: 0 };
    });

    safeExpenses.forEach(exp => {
      // If everyone paid their own share, no debts are created
      if (exp.paidByMultiple) return;

      const payerId = exp.paidByGuestId || exp.paidBy?._id;
      if (payerId && balances[payerId]) {
        balances[payerId].netAmount += exp.totalAmount;
      }
      (exp.participants || []).forEach(p => {
        const pId = p.guestId || p.userId?._id;
        if (pId && balances[pId]) {
          balances[pId].netAmount -= p.amountOwed;
        }
      });
    });
    return Object.values(balances);
  };

  const simplifyDebts = (bals) => {
    const debtors = [];
    const creditors = [];
    
    bals.forEach(b => {
      if (b.netAmount < -0.01) debtors.push({ id: b.id, name: b.name, amount: Math.abs(b.netAmount) });
      else if (b.netAmount > 0.01) creditors.push({ id: b.id, name: b.name, amount: b.netAmount });
    });

    const transactions = [];
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      
      const settleAmount = Math.min(debtor.amount, creditor.amount);
      
      transactions.push({
        from: debtor.id,
        fromName: debtor.name,
        to: creditor.id,
        toName: creditor.name,
        amount: settleAmount
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }
    
    return transactions;
  };

  const balances = calculateBalances();
  const simplifiedDebts = simplifyDebts(balances);
  const totalTripCost = safeExpenses.reduce((sum, exp) => sum + (exp?.totalAmount || 0), 0);

  const handleShareSummary = () => {
    let summaryText = `💰 Trip Expense Summary 💰\n\nTotal Spend: ₹${totalTripCost.toFixed(2)}\n\n*Who Owes What:*\n`;
    balances.forEach(b => {
      if (Math.abs(b.netAmount) >= 1) {
        if (b.netAmount > 0) {
          summaryText += `🟢 ${b.name} gets back ₹${b.netAmount.toFixed(0)}\n`;
        } else {
          summaryText += `🔴 ${b.name} owes ₹${Math.abs(b.netAmount).toFixed(0)}\n`;
        }
      }
    });
    if (navigator.share) {
      navigator.share({ title: 'Trip Expenses', text: summaryText }).catch(err => console.error("Error sharing", err));
    } else {
      navigator.clipboard.writeText(summaryText);
      alert("Expense summary copied to clipboard! You can paste it in WhatsApp.");
    }
  };

  if (loading) return <div className="p-8 text-apple-gray">Loading expenses...</div>;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c]">
      <div className="p-8 border-b border-white/10 flex justify-between items-center bg-apple-surface/20">
        <div>
          <h2 className="text-2xl font-bold text-white">Trip Ledger</h2>
          <p className="text-sm text-apple-gray">Total Group Spend: ₹{totalTripCost.toFixed(2)}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowManageModal(true)} className="px-5 py-2.5 text-sm font-bold text-apple-gray bg-apple-surfaceHover rounded-xl hover:text-white transition-colors">
            👥 View Group
          </button>
          <button onClick={() => setShowInviteModal(true)} className="px-5 py-2.5 text-sm font-bold text-apple-black bg-white rounded-xl hover:opacity-90 transition-opacity">
            + Add Participant
          </button>
          <button onClick={handleShareSummary} className="px-5 py-2.5 text-sm font-bold text-white bg-apple-surfaceHover rounded-xl hover:bg-white/10 transition-colors">
            Share on WhatsApp
          </button>
          <button onClick={() => { setEditExpenseId(null); setFormData({ description: '', category: 'Food', totalAmount: '', paidById: user?._id || '', splitType: 'EQUAL', selectedUserIds: [], exactParticipants: {} }); setShowAddModal(true); }} className="px-5 py-2.5 text-sm font-bold text-apple-black bg-apple-green rounded-xl hover:opacity-90 transition-opacity">
            + Log Expense
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white mb-4">Transaction History</h3>
          {safeExpenses.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/20 rounded-2xl text-apple-gray">No expenses logged yet.</div>
          ) : (
            safeExpenses.map(exp => (
              <div key={exp._id} className="p-5 bg-apple-surface rounded-2xl border border-white/5 flex justify-between items-center group hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-apple-blue/20 text-apple-blue flex items-center justify-center font-bold text-xl">
                    {exp.category === 'Food' ? '🍔' : exp.category === 'Transport' ? '🚕' : exp.category === 'Stay' ? '🏨' : '💸'}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">{exp.description}</h4>
                    <p className="text-xs text-apple-gray">
                      {exp.paidByMultiple 
                        ? <span className="text-apple-green">Everyone paid their share</span> 
                        : <>Paid by <span className="text-apple-blue">{
                            exp.paidByGuestId 
                              ? (safeTripMembers.find(m => m.guestId === exp.paidByGuestId)?.name || 'Guest') 
                              : (exp.paidBy?.name || 'Unknown')
                          }</span></>
                      } • {new Date(exp.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xl font-bold text-white">₹{exp.totalAmount}</p>
                    <p className="text-xs text-apple-gray px-2 py-1 bg-black/40 rounded-md inline-block mt-1">{exp.splitType} SPLIT</p>
                  </div>
                  {isCreator && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditExpenseClick(exp)} className="p-1.5 text-apple-gray hover:text-apple-blue bg-white/5 rounded-md transition-colors text-xs">✏️</button>
                      <button onClick={() => handleDeleteExpense(exp._id)} className="p-1.5 text-apple-gray hover:text-apple-red bg-white/5 rounded-md transition-colors text-xs">🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-apple-surface rounded-3xl border border-white/5 p-6 h-fit sticky top-8">
          <h3 className="text-lg font-bold text-white mb-6">Who Owes What</h3>
          <div className="space-y-4">
            {balances.map((b, idx) => {
              const net = b.netAmount;
              if (Math.abs(net) < 1) return null; 
              const isExpanded = expandedBalanceId === b.id;
              
              const userOwes = simplifiedDebts.filter(t => t.from === b.id);
              const userGets = simplifiedDebts.filter(t => t.to === b.id);

              return (
                <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl bg-apple-surfaceHover cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpandedBalanceId(isExpanded ? null : b.id)}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white">{b.name}</span>
                    <div className="flex items-center gap-2">
                      {net > 0 ? (
                        <span className="text-sm font-bold text-apple-green">Gets back ₹{net.toFixed(0)}</span>
                      ) : (
                        <span className="text-sm font-bold text-apple-red">Owes ₹{Math.abs(net).toFixed(0)}</span>
                      )}
                      <span className="text-xs text-apple-gray ml-1">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  
                  {isExpanded && (userOwes.length > 0 || userGets.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                      {userOwes.map((t, i) => (
                        <div key={`owe-${i}`} className="flex justify-between text-xs text-apple-gray">
                          <span>Owes <span className="text-white font-medium">{t.toName}</span></span>
                          <span className="text-apple-red">₹{t.amount.toFixed(0)}</span>
                        </div>
                      ))}
                      {userGets.map((t, i) => (
                        <div key={`gets-${i}`} className="flex justify-between text-xs text-apple-gray">
                          <span><span className="text-white font-medium">{t.fromName}</span> owes them</span>
                          <span className="text-apple-green">₹{t.amount.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-apple-gray text-center mt-6">Balances are calculated automatically across all logged transactions.</p>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-apple-surface rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">{editExpenseId ? 'Edit Expense' : 'Log an Expense'}</h2>
            <form onSubmit={handleAddExpense} className="space-y-5">
              <div>
                <label className="block mb-2 text-sm text-apple-gray">Description</label>
                <input type="text" placeholder="e.g. Dinner at Bawarchi" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue" />
              </div>

              <div>
                <label className="block mb-2 text-sm text-apple-gray">Who Paid?</label>
                <select value={formData.paidById} onChange={e => setFormData({...formData, paidById: e.target.value})} className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue appearance-none">
                  {safeTripMembers.map(member => {
                    const { id, name } = getMemberInfo(member);
                    return <option key={id} value={id}>{name}</option>;
                  })}
                  <option value="MULTIPLE">Everyone paid their own share</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm text-apple-gray">Amount (₹)</label>
                  <input type="number" min="1" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} required className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue" />
                </div>
                <div>
                  <label className="block mb-2 text-sm text-apple-gray">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue appearance-none">
                    <option>Food</option>
                    <option>Transport</option>
                    <option>Stay</option>
                    <option>Activity</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm text-apple-gray">Split Method</label>
                <div className="flex gap-2 p-1 bg-apple-surfaceHover rounded-lg">
                  <button type="button" onClick={() => setFormData({...formData, splitType: 'EQUAL'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${formData.splitType === 'EQUAL' ? 'bg-apple-blue text-white shadow' : 'text-apple-gray'}`}>EQUAL</button>
                  <button type="button" onClick={() => setFormData({...formData, splitType: 'CUSTOM'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${formData.splitType === 'CUSTOM' ? 'bg-apple-blue text-white shadow' : 'text-apple-gray'}`}>CUSTOM</button>
                  <button type="button" onClick={() => setFormData({...formData, splitType: 'EXACT'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${formData.splitType === 'EXACT' ? 'bg-apple-blue text-white shadow' : 'text-apple-gray'}`}>EXACT</button>
                </div>
              </div>

              {formData.splitType === 'CUSTOM' && (
                <div className="p-4 bg-apple-surfaceHover rounded-xl border border-white/5 space-y-2">
                  <p className="text-xs text-apple-gray mb-3">Select who shares this cost:</p>
                  {safeTripMembers.map(member => {
                    const { id, name } = getMemberInfo(member);
                    return (
                      <label key={id} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.selectedUserIds.includes(id)} onChange={() => toggleUserSelection(id)} className="w-4 h-4 accent-apple-blue rounded" />
                        <span className="text-sm text-white">{name}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {formData.splitType === 'EXACT' && (
                <div className="p-4 bg-apple-surfaceHover rounded-xl border border-white/5 space-y-3">
                  <p className="text-xs text-apple-gray mb-1">Enter exact amounts (Must total ₹{formData.totalAmount || 0}):</p>
                  {safeTripMembers.map(member => {
                    const { id, name } = getMemberInfo(member);
                    return (
                      <div key={id} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white flex-1">{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-apple-gray">₹</span>
                          <input 
                            type="number" 
                            placeholder="0"
                            min="0"
                            value={formData.exactParticipants[id] || ''} 
                            onChange={(e) => handleExactAmountChange(id, e.target.value)} 
                            className="w-24 p-2 bg-apple-black text-white rounded-lg outline-none focus:ring-1 focus:ring-apple-blue text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-sm font-bold text-white bg-apple-surfaceHover rounded-xl hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-apple-black bg-apple-green rounded-xl hover:opacity-90 transition-opacity">
                  {editExpenseId ? 'Save Changes' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-apple-surface rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Add Participant</h2>
            
            <div className="flex gap-2 p-1 bg-apple-surfaceHover rounded-lg mb-6">
              <button onClick={() => setInviteTab('Email')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${inviteTab === 'Email' ? 'bg-apple-blue text-white shadow' : 'text-apple-gray'}`}>Registered User</button>
              <button onClick={() => setInviteTab('Guest')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${inviteTab === 'Guest' ? 'bg-apple-blue text-white shadow' : 'text-apple-gray'}`}>Guest Name</button>
            </div>

            <form onSubmit={handleInvite} className="space-y-5">
              {inviteTab === 'Email' ? (
                <div>
                  <label className="block mb-2 text-sm text-apple-gray">User's Email</label>
                  <input type="email" placeholder="friend@example.com" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} required className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue" />
                </div>
              ) : (
                <div>
                  <label className="block mb-2 text-sm text-apple-gray">Guest Name</label>
                  <input type="text" placeholder="e.g. Uncle Bob" value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} required className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue" />
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-5 py-2.5 text-sm font-bold text-white bg-apple-surfaceHover rounded-xl hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={inviteLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-apple-blue rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">{inviteLoading ? 'Adding...' : 'Add Participant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-6 bg-apple-surface rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Group Members</h2>
              <button onClick={() => setShowManageModal(false)} className="text-apple-gray hover:text-white">✕</button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {safeTripMembers.map(member => {
                const { id, name } = getMemberInfo(member);
                const isSelf = member.userId?._id === user?._id;
                
                return (
                  <div key={member._id || id} className="flex items-center justify-between p-4 bg-apple-surfaceHover rounded-xl border border-white/5">
                    <div>
                      <h4 className="text-white font-bold">{name} {isSelf && <span className="text-xs text-apple-gray ml-2">(You)</span>}</h4>
                      <p className="text-xs text-apple-gray">{member.role} {member.isGuest && '• Guest'}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {isCreator && member.isGuest && renameMemberId !== member._id && (
                        <button onClick={() => { setRenameMemberId(member._id); setRenameValue(name); }} className="p-2 text-apple-gray hover:text-apple-blue bg-white/5 rounded-lg transition-colors">
                          ✏️
                        </button>
                      )}
                      
                      {isCreator && !isSelf && (
                        <button onClick={() => handleDeleteMember(member._id)} disabled={manageLoading} className="p-2 text-apple-gray hover:text-apple-red bg-white/5 rounded-lg transition-colors disabled:opacity-50">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {renameMemberId && (
              <div className="mt-6 p-4 bg-apple-surfaceHover border border-white/10 rounded-xl">
                <h4 className="text-sm font-bold text-white mb-2">Rename Guest</h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={renameValue} 
                    onChange={e => setRenameValue(e.target.value)} 
                    className="flex-1 p-3 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue text-sm"
                  />
                  <button onClick={() => handleRenameGuest(renameMemberId)} disabled={manageLoading || !renameValue.trim()} className="px-4 bg-apple-blue text-white rounded-xl text-sm font-bold disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={() => setRenameMemberId(null)} className="px-4 bg-white/10 text-white rounded-xl text-sm font-bold">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}