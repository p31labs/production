import { useState } from 'react';

interface EditProfileModalProps {
  onClose: () => void;
}

export default function EditProfileModal({ onClose }: EditProfileModalProps) {
  const [name, setName] = useState('Atlas');
  const [bio, setBio] = useState('Building bonds, one atom at a time.');
  const [skills, setSkills] = useState<string[]>(['React', 'MapLibre', 'PostGIS', 'UI/UX', 'Rust', 'Python']);
  const [interests, setInterests] = useState<string[]>(['gaming', 'music', 'gardening', 'cooking', 'hiking', 'coding']);

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  return (
    <div className="modal-ov show" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Profile</h2>
        <div className="form-group">
          <label htmlFor="editName">Name</label>
          <input
            id="editName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="editBio">Bio</label>
          <textarea
            id="editBio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Skills</label>
          <div className="chip-row" id="editSkills">
            {skills.map((skill) => (
              <span key={skill} className="chip">
                {skill}
                <span className="rm" onClick={() => removeSkill(skill)}>✕</span>
              </span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Interests</label>
          <div className="chip-row" id="editInterests">
            {interests.map((interest) => (
              <span key={interest} className="chip">
                {interest}
                <span className="rm" onClick={() => removeInterest(interest)}>✕</span>
              </span>
            ))}
          </div>
        </div>
        <div className="modal-row">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={onClose}>Save</button>
        </div>
      </div>
    </div>
  );
}
