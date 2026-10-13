import React from 'react';
import { User, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
  emiratesId: string;
  profileImage?: string;
}

interface FamilyTreeProps {
  members: FamilyMember[];
  primaryUser: {
    name: string;
    profileImage?: string;
  };
}

export const FamilyTree: React.FC<FamilyTreeProps> = ({ members, primaryUser }) => {
  const { t } = useTranslation('common');
  const spouse = members.find(m => m.relationship === 'Spouse');
  const parents = members.filter(m => m.relationship === 'Parent');
  const children = members.filter(m => m.relationship === 'Child');
  const siblings = members.filter(m => m.relationship === 'Sibling');
  const others = members.filter(m => !['Spouse', 'Parent', 'Child', 'Sibling'].includes(m.relationship));

  const renderMemberCard = (member: FamilyMember | { name: string; profileImage?: string; relationship?: string }, isPrimary = false) => (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative ${isPrimary ? 'w-20 h-20' : 'w-16 h-16'} rounded-full ${
        isPrimary
          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 ring-4 ring-blue-200'
          : 'relationship' in member && member.relationship === 'Spouse'
          ? 'bg-gradient-to-br from-pink-400 to-rose-400 ring-4 ring-pink-200'
          : 'relationship' in member && member.relationship === 'Parent'
          ? 'bg-gradient-to-br from-purple-400 to-violet-400 ring-4 ring-purple-200'
          : 'relationship' in member && member.relationship === 'Child'
          ? 'bg-gradient-to-br from-green-400 to-emerald-400 ring-4 ring-green-200'
          : 'relationship' in member && member.relationship === 'Sibling'
          ? 'bg-gradient-to-br from-orange-400 to-amber-400 ring-4 ring-orange-200'
          : 'bg-gradient-to-br from-gray-400 to-slate-400 ring-4 ring-gray-200'
      } flex items-center justify-center overflow-hidden shadow-lg hover:scale-110 transition-transform duration-200`}>
        {member.profileImage ? (
          <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <User className={`${isPrimary ? 'w-10 h-10' : 'w-8 h-8'} text-white`} />
        )}
      </div>
      <div className="text-center">
        <p className={`${isPrimary ? 'font-bold text-base' : 'font-semibold text-sm'} text-gray-900`}>{member.name}</p>
        {'relationship' in member && member.relationship && (
          <p className="text-xs text-gray-500 font-medium">{member.relationship}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="py-8">
      {members.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-3xl flex items-center justify-center">
            <User className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-lg font-semibold text-gray-700">{t('patient.profile.familyEmptyTitle', { defaultValue: 'No family members added yet' })}</p>
          <p className="text-sm text-gray-500 mt-2">{t('patient.profile.familyEmptyBody', { defaultValue: 'Add your family members to see the family tree' })}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-12">
          {parents.length > 0 && (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex justify-center gap-16">
                {parents.map(parent => (
                  <div key={parent.id}>
                    {renderMemberCard(parent)}
                  </div>
                ))}
              </div>
              <div className="h-12 w-0.5 bg-gradient-to-b from-purple-300 to-blue-300"></div>
            </div>
          )}

          <div className="flex flex-col items-center space-y-4">
            {siblings.length > 0 && (
              <div className="flex items-center gap-8 mb-8">
                {siblings.map(sibling => (
                  <div key={sibling.id}>
                    {renderMemberCard(sibling)}
                  </div>
                ))}
                <div className="h-0.5 w-8 bg-gradient-to-r from-orange-300 to-blue-300"></div>
              </div>
            )}

            <div className="flex items-center justify-center gap-8">
              {renderMemberCard(primaryUser, true)}

              {spouse && (
                <>
                  <div className="flex flex-col items-center">
                    <Heart className="w-6 h-6 text-pink-500 animate-pulse" />
                    <div className="h-0.5 w-12 bg-gradient-to-r from-pink-300 to-rose-300"></div>
                  </div>
                  {renderMemberCard(spouse)}
                </>
              )}
            </div>
          </div>

          {children.length > 0 && (
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-0.5 bg-gradient-to-b from-blue-300 to-green-300"></div>
              <div className="flex justify-center gap-8">
                {children.map(child => (
                  <div key={child.id}>
                    {renderMemberCard(child)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div className="flex flex-col items-center space-y-4 mt-8">
              <div className="h-8 w-0.5 bg-gradient-to-b from-gray-300 to-slate-300"></div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Other Relations</p>
              <div className="flex justify-center gap-8 flex-wrap">
                {others.map(other => (
                  <div key={other.id}>
                    {renderMemberCard(other)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
