import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FaAngleLeft } from 'react-icons/fa';
import { db } from '../../firebase.config';
import { toast } from 'react-toastify';
import { format, isToday, isYesterday, subDays, subMonths } from 'date-fns';

const VendorHistory = ({ setShowHistory }) => {
  const [vendorId, setVendorId] = useState(null);
  const [recentActivities, setRecentActivities] = useState({
    today: [],
    yesterday: [],
    last7Days: [],
    lastMonth: [],
    older: []
  });

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setVendorId(user.uid);
        const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
        if (vendorDoc.exists()) {
          await fetchRecentActivities(user.uid);
        } else {
          toast.error("Vendor data not found");
        }
      }
    });
  }, []);

  const fetchRecentActivities = async (vendorId) => {
    try {
      const activityRef = collection(db, "vendors", vendorId, "activityNotes");
      const recentActivityQuery = query(activityRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(recentActivityQuery);

      const activities = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      const groupedActivities = {
        today: [],
        yesterday: [],
        last7Days: [],
        lastMonth: [],
        older: []
      };

      const now = new Date();

      activities.forEach(activity => {
        const activityDate = activity.timestamp.toDate();

        if (isToday(activityDate)) {
          groupedActivities.today.push(activity);
        } else if (isYesterday(activityDate)) {
          groupedActivities.yesterday.push(activity);
        } else if (activityDate >= subDays(now, 7)) {
          groupedActivities.last7Days.push(activity);
        } else if (activityDate >= subMonths(now, 1)) {
          groupedActivities.lastMonth.push(activity);
        } else {
          groupedActivities.older.push(activity);
        }
      });

      setRecentActivities(groupedActivities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      toast.error("Failed to fetch recent activities.");
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg max-w-3xl mx-auto font-ubuntu">
      <div className="flex items-center mb-4">
        <FaAngleLeft
          className="text-2xl text-gray-700 cursor-pointer"
          onClick={() => setShowHistory(false)}
        />
        <h2 className="text-xl ml-4 text-gray-900">Recent Activities</h2>
      </div>
      <div className="space-y-6">
        {recentActivities.today.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-400">Today</h3>
            <ul className="space-y-2">
              {recentActivities.today.map((activity) => (
                <li key={activity.id} className="text-gray-700 bg-gray-100 p-2 rounded-lg flex justify-between border-orange-200 border-2">
                  <span>{activity.note}</span>  <span className="text-gray-500 text-sm">{format(activity.timestamp.toDate(), 'p')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {recentActivities.yesterday.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-400">Yesterday</h3>
            <ul className="space-y-2">
              {recentActivities.yesterday.map((activity) => (
                <li key={activity.id} className="text-gray-700 bg-gray-100 p-2 rounded-lg flex justify-between border-orange-200 border-2">
                  <span>{activity.note}</span>  <span className="text-gray-500 text-sm">{format(activity.timestamp.toDate(), 'p')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {recentActivities.last7Days.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-400">Last 7 Days</h3>
            <ul className="space-y-2">
              {recentActivities.last7Days.map((activity) => (
                <li key={activity.id} className="text-gray-700 bg-gray-100 p-2 rounded-lg flex justify-between border-orange-200 border-2">
                  <span>{activity.note}</span>  <span className="text-gray-500 text-sm">{format(activity.timestamp.toDate(), 'MM/dd/yyyy')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {recentActivities.lastMonth.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-400">Last Month</h3>
            <ul className="space-y-2">
              {recentActivities.lastMonth.map((activity) => (
                <li key={activity.id} className="text-gray-700 bg-gray-100 p-2 rounded-lg flex justify-between border-orange-200 border-2">
                  <span>{activity.note}</span>  <span className="text-gray-500 text-sm">{format(activity.timestamp.toDate(), 'MM/dd/yyyy')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {recentActivities.older.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-400">Older</h3>
            <ul className="space-y-2">
              {recentActivities.older.map((activity) => (
                <li key={activity.id} className="text-gray-700 bg-gray-100 p-2 rounded-lg flex justify-between border-orange-200 border-2">
                  <span>{activity.note}</span>  <span className="text-gray-500 text-sm">{format(activity.timestamp.toDate(), 'MM/dd/yyyy')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorHistory;
