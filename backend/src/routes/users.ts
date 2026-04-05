import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import userAuthMiddleware, { UserAuthRequest } from '../middleware/userAuthMiddleware';
import Product from '../models/Product';

const router = Router();
router.use(userAuthMiddleware);

// ============ ADDRESSES ============
router.get('/addresses', async (req: UserAuthRequest, res: Response) => {
  try {
    res.json({ success: true, addresses: req.user.savedAddresses });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/addresses', async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const newAddress = req.body;
    if (newAddress.isDefault) {
      user.savedAddresses.forEach(addr => {
         // Need to cast to any since subdocument typing can be tricky
         (addr as any).isDefault = false;
      });
    }

    user.savedAddresses.push(newAddress);
    await user.save();
    res.json({ success: true, addresses: user.savedAddresses });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.put('/addresses/:id', async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const updatedData = req.body;
    const address = user.savedAddresses.id(req.params.id);
    if (!address) return res.status(404).json({ success: false, error: 'Address not found' });

    if (updatedData.isDefault) {
       user.savedAddresses.forEach(addr => {
         if (addr._id?.toString() !== req.params.id) {
            (addr as any).isDefault = false;
         }
       });
    }

    address.set(updatedData);
    await user.save();
    res.json({ success: true, addresses: user.savedAddresses });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/addresses/:id', async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.savedAddresses.pull(req.params.id);
    await user.save();
    res.json({ success: true, addresses: user.savedAddresses });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ============ WISHLIST ============
router.get('/wishlist', async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json({ success: true, wishlist: user?.wishlist || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/wishlist', async (req: UserAuthRequest, res: Response) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }
    
    // return array of strings
    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/wishlist/:productId', async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    
    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
