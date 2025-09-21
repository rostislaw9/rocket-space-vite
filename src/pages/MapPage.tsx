import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import UserProfileDrawer from '@/components/UserProfileDrawer';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/utils/api';
import { getMapUsers } from '@/utils/api';

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function TeamLocationsPage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const loadUsers = async () => {
      try {
        const response = await getMapUsers(user.id);
        setUsers(response.data);
      } catch {
        toast.error('Failed to load map users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [user?.id]);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style:
        resolvedTheme === 'dark'
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/light-v11',
      zoom: 2,
      projection: { name: 'globe' },
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (!map.current || users.length === 0) return;

    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    users.forEach((u) => {
      if (!u.latitude || !u.longitude) return;

      const el = document.createElement('div');
      el.className = 'relative cursor-pointer';
      el.style.width = '40px';
      el.style.height = '40px';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([u.longitude, u.latitude])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setProfileUserId(u.id);
      });

      markers.current.push(marker);

      const hasAvatar = u.avatarUrl && u.avatarUrl.trim() !== '';
      const userIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-icon lucide-user-round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`;

      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
        ">
          ${
            hasAvatar
              ? `
            <img
              src="${u.avatarUrl}"
              alt="${u.displayName || u.email}"
              style="
                width: 100%;
                height: 100%;
                object-fit: cover;
              "
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div style="
              width: 100%;
              height: 100%;
              display: none;
              align-items: center;
              justify-content: center;
              background: #e5e7eb;
            ">${userIcon}</div>
          `
              : userIcon
          }
        </div>
      `;
    });

    if (users.length > 0 && users.some((u) => u.latitude && u.longitude)) {
      const bounds = new mapboxgl.LngLatBounds();
      users.forEach((u) => {
        if (u.latitude && u.longitude) {
          bounds.extend([u.longitude, u.latitude]);
        }
      });

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 10,
        duration: 1000,
      });
    }
  }, [users]);

  return (
    <PageShell
      title="Locations"
      description="View your team members on an interactive globe. Click on markers to see member details"
      fullHeight
    >
      <div className="relative flex h-full flex-col">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <LoadingSpinner />
          </div>
        )}

        <div
          ref={mapContainer}
          className="flex-1 rounded-xl ring-1 ring-foreground/10"
          data-slot="card"
          style={{ minHeight: '400px' }}
        />

        <UserProfileDrawer
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
          onMessage={(id) => navigate(`/chat?peer=${id}`)}
          currentUserId={user?.id}
        />

        {users.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-muted-foreground">
              No users with visible locations found.
              <br />
              Users need to set their location and privacy settings to appear on
              the map.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
