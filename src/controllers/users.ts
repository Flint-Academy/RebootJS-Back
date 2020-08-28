import { User, IProfile } from "../models/users";
import { UserNotFoundError } from "../errors";

export function findUser(
  id: string,
  next: (err: Error, user: IProfile | null) => any
) {
  User.findById(id, (err, user) => {
    next(err, user);
  });
}

export function addNewUser(
  data: any,
  next: (err: Error, prof: IProfile) => any
): void {
  const newUser = new User(data);
  newUser.save((err, createdProfile) => {
    next(err, createdProfile);
  });
}

export function deleteUser(id: string, next: (err: Error | null, deleted: boolean) => any): void {
  User.findById(id, (err, user) => {
    if (err) { next(err, false) }
    else if (user == null) { next(new UserNotFoundError(), false) }
    else {
      user.deleteOne((err, _deletedUser) => {
        if (err) {
          next(err, false)
        } else {
          next(null, true)
        }
      })
    }
  })
  return;
}

export function updateUser(id: string, data: any, next: (err: Error | null, updated: boolean) => any): void {
  User.findById(id, (err, user) => {
    if (err) { next(err, false) }
    else if (user == null) { next(new UserNotFoundError(), false) }
    else {
      user.update(data, (err, _raw) => {
        if (err) { next(err, false) }
        else { next(null, true)}
      })
    }
  })
}
