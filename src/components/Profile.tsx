import React, { useState, useEffect } from 'react';
import styles from './Profile.module.css';
import { getAuth } from 'firebase/auth';
import { storeFirestore as store } from './firestore/storeFirestore';
import { Group, Player } from '../types/types';

interface ProfileProps {
  onNameChange?: (name: string) => void;
  onGroupChange?: (group: Group) => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  onNameChange, 
  onGroupChange, 
}) => {
  const auth = getAuth();
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName || '');
  const [group, setGroup] = useState<Group | undefined>();
  const [player, setPlayer] = useState<Player | undefined>();

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const player: Player | undefined = await store.getPlayerInfo();
        if (player) {
          setName(player.name);
          if (!group && player.groups) {
            
            const group = player.groups[0];
            setPlayer(player);
            setGroup(group);
            onGroupChange?.(group);
          }
        }
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    };
    loadGroups();
  }, [group, onGroupChange]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    onNameChange?.(newName);
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroup = e.target.value;
    const group = player?.groups?.find((g: Group) => g.id === newGroup);
    setGroup(group!);
    onGroupChange?.(group!);
  };

  const defaultAvatarPath = process.env.PUBLIC_URL + '/images/default-avatar.jpg';

  return (
    <div className={styles.profile}>
      <h2>Profile</h2>
      
      <div className={styles.avatarSection}>
        {
          player && (
            <img 
              src={player.avatar || defaultAvatarPath} 
              alt={`${player.name}'s profile`} 
              className={styles.avatar}
              onError={(e) => {
                console.error('Error loading avatar:', e);
                const img = e.target as HTMLImageElement;
                img.src = defaultAvatarPath;
              }}
              referrerPolicy="no-referrer"
            />
          )
        }
      </div>
      <div className={styles.profileForm}>
        <div className={styles.formGroup}>
          <label>Name:</label>
          <input 
            type="text" 
            value={name}
            onChange={handleNameChange}
            className={styles.input}
            placeholder="Enter your name"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Email:</label>
          <input 
            type="email" 
            value={player?.email || ''}
            readOnly
            className={`${styles.input} ${styles.readonly}`}
          />
        </div>

        <div className={styles.formGroup}>
          <label>User ID:</label>
          <input 
            type="text" 
            value={player?.id || ''}
            readOnly
            className={`${styles.input} ${styles.readonly}`}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Group:</label>
          <select 
            value={group?.id || ''} 
            onChange={handleGroupChange}
            className={styles.select}
          >
            <option value="">Select a group</option>
            {player?.groups?.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Profile;